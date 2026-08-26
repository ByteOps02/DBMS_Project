import { useState, useEffect } from "react";
import {
  PackageSearch,
  Plus,
  Search,
  CheckCircle2,
  MapPin,
  User,
  ShieldCheck,
  X,
  HandMetal,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { formatIST } from "../lib/dateIST";
import { PageHeader } from "./PageHeader";
import { BackButton } from "./BackButton";
import { CustomSelect } from "./ui/CustomSelect";
import { useAuthStore } from "../store/auth";


const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "electronics", label: "💻 Electronics & Chargers" },
  { value: "documents", label: "🪪 ID Cards & Documents" },
  { value: "keys", label: "🔑 Keys & Keychains" },
  { value: "wallet", label: "👛 Wallets & Purses" },
  { value: "clothing", label: "🎒 Bags & Clothing" },
  { value: "other", label: "📦 Miscellaneous" },
];

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "in_custody", label: "🟢 In Custody (Unclaimed)" },
  { value: "claimed", label: "✅ Claimed & Handed Over" },
];

export function LostAndFound() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, inCustody: 0, claimed: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [claimingItem, setClaimingItem] = useState<any | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("electronics");
  const [newDesc, setNewDesc] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newFinderName, setNewFinderName] = useState(user?.name || "");
  const [newFinderContact, setNewFinderContact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Claim modal form
  const [claimantName, setClaimantName] = useState("");
  const [claimantId, setClaimantId] = useState("");
  const [claimantPhone, setClaimantPhone] = useState("");
  const [handoverOfficer, setHandoverOfficer] = useState(user?.name || "Duty Guard");
  const [isClaiming, setIsClaiming] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.lostAndFound.list({
        search: search.trim() || undefined,
        category: category !== "all" ? category : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setItems(res.items);
      setStats(res.stats);
    } catch (err: any) {
      toast.error(err.message || "Failed to load lost & found items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [category, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newLocation.trim() || !newFinderName.trim()) {
      toast.error("Please fill in required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.lostAndFound.create({
        title: newTitle.trim(),
        category: newCategory,
        description: newDesc.trim() || undefined,
        location_found: newLocation.trim(),
        found_by_name: newFinderName.trim(),
        found_by_contact: newFinderContact.trim() || undefined,
      });

      toast.success("Found item logged in campus registry!");
      setShowAddModal(false);
      setNewTitle("");
      setNewDesc("");
      setNewLocation("");
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to log item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingItem || !claimantName.trim() || !claimantId.trim()) {
      toast.error("Claimant name and Roll No / ID are required.");
      return;
    }

    setIsClaiming(true);
    try {
      await api.lostAndFound.claim(claimingItem.id, {
        claimed_by_name: claimantName.trim(),
        claimed_by_id: claimantId.trim().toUpperCase(),
        claimed_by_phone: claimantPhone.trim() || undefined,
        handover_officer: handoverOfficer.trim(),
      });

      toast.success("Item claim verified and handed over!");
      setClaimingItem(null);
      setClaimantName("");
      setClaimantId("");
      setClaimantPhone("");
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to process handover.");
    } finally {
      setIsClaiming(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this item from registry?")) return;
    try {
      await api.lostAndFound.delete(id);
      toast.success("Item removed.");
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove item.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 animate-fadeIn space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BackButton />
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <PageHeader
          icon={PackageSearch}
          gradient="from-amber-600 to-orange-600"
          title="Campus Lost & Found Registry"
          description="Centralized inventory of recovered items across Academic Blocks, Central Library, Hostels, and Grounds."
        />

        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary text-xs sm:text-sm font-bold flex items-center gap-2 py-3 px-5 shadow-lg shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Log Recovered Item</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              Total Logged Items
            </span>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {stats.total}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <PackageSearch className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              In Security Custody
            </span>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {stats.inCustody}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              Claimed & Handed Over
            </span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.claimed}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items, locations, claimants..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button type="submit" className="btn btn-primary text-xs py-2 px-4">
            Search
          </button>
        </form>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="w-full sm:w-52">
            <CustomSelect
              value={category}
              onChange={setCategory}
              options={CATEGORIES}
              className="!py-2 !px-3 text-xs font-bold"
            />
          </div>
          <div className="w-full sm:w-52">
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTERS}
              className="!py-2 !px-3 text-xs font-bold"
            />
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="p-20 text-center text-xs font-bold uppercase tracking-widest text-gray-400 animate-pulse">
          Loading Lost & Found Registry...
        </div>
      ) : items.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
          <PackageSearch className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No items found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            No lost or found items matched your search criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 transition-all flex flex-col justify-between gap-4 shadow-sm hover:shadow-md ${
                item.status === "claimed"
                  ? "border-emerald-500/30 bg-emerald-50/10"
                  : "border-gray-200 dark:border-slate-800 hover:border-amber-500/50"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    item.status === "claimed"
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                  }`}>
                    {item.status === "claimed" ? "✅ Handed Over" : "🟢 In Custody"}
                  </span>
                  <span className="text-xs font-medium text-gray-400">
                    {formatIST(item.created_at)}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug">
                  {item.title}
                </h3>

                {item.description && (
                  <p className="text-sm text-gray-600 dark:text-slate-300 line-clamp-2">
                    {item.description}
                  </p>
                )}

                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800 text-xs sm:text-sm text-gray-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-semibold truncate">{item.location_found}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-sky-500 shrink-0" />
                    <span>Found by: <strong className="text-gray-900 dark:text-white">{item.found_by_name}</strong> ({item.found_by_role})</span>
                  </div>
                </div>

                {item.status === "claimed" && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 space-y-1 mt-2">
                    <p className="font-bold">Claimant: {item.claimed_by_name} ({item.claimed_by_id})</p>
                    <p className="text-xs opacity-80">Officer: {item.handover_officer}</p>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-slate-800">
                {item.status === "in_custody" ? (
                  <button
                    onClick={() => setClaimingItem(item)}
                    className="btn btn-sm btn-primary text-xs sm:text-sm font-bold flex items-center gap-1.5 py-2 px-4 shadow-sm"
                  >
                    <HandMetal className="w-4 h-4" />
                    <span>Verify & Handover</span>
                  </button>
                ) : (
                  <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Verified Claim
                  </span>
                )}


                {user?.role === "admin" && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-gray-400 hover:text-red-500 p-1.5 transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log Found Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
              Log Recovered Campus Item
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              Record belongings found on campus for student/visitor recovery.
            </p>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">
                  Item Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Dell Laptop Charger 65W"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">
                    Category
                  </label>
                  <CustomSelect
                    value={newCategory}
                    onChange={setNewCategory}
                    options={CATEGORIES.filter((c) => c.value !== "all")}
                    className="!py-2 !px-3 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">
                    Location Found <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Library 2nd Floor"
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">
                  Description / Distinguishing Marks
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="e.g. Black color, initial 'A' engraved on top..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">
                    Finder Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newFinderName}
                    onChange={(e) => setNewFinderName(e.target.value)}
                    placeholder="e.g. Guard Ramesh"
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">
                    Finder Phone
                  </label>
                  <input
                    type="tel"
                    value={newFinderContact}
                    onChange={(e) => setNewFinderContact(e.target.value)}
                    placeholder="e.g. 9823001122"
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary text-xs font-bold px-6"
                >
                  {isSubmitting ? "Logging..." : "Log Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claim Handover Modal */}
      {claimingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 relative">
            <button
              onClick={() => setClaimingItem(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
              Verify Claimant & Process Handover
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Item: <strong>{claimingItem.title}</strong>
            </p>

            <form onSubmit={handleClaimHandover} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">
                  Claimant Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={claimantName}
                  onChange={(e) => setClaimantName(e.target.value)}
                  placeholder="e.g. Aditya Singh"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">
                  Roll Number or Government ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={claimantId}
                  onChange={(e) => setClaimantId(e.target.value.toUpperCase())}
                  placeholder="e.g. BT26ECE001 or Aadhaar / DL"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">
                  Claimant Mobile Phone
                </label>
                <input
                  type="tel"
                  value={claimantPhone}
                  onChange={(e) => setClaimantPhone(e.target.value)}
                  placeholder="e.g. 9821011128"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">
                  Handover Officer Name
                </label>
                <input
                  type="text"
                  value={handoverOfficer}
                  onChange={(e) => setHandoverOfficer(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setClaimingItem(null)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isClaiming}
                  className="btn btn-primary text-xs font-bold px-6 bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                >
                  {isClaiming ? "Processing..." : "Confirm Handover"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
