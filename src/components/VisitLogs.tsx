import { useState, useEffect } from 'react';
import { Search, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Visit } from '../lib/database.types';

const getDynamicStatus = (visit: Visit) => {
  // Get current date and time
  const now = new Date();
  const currentTimestamp = now.getTime(); // milliseconds since epoch
  
  // Parse check-in date and time
  const checkIn = visit.check_in ? new Date(visit.check_in) : null;
  const checkInTimestamp = checkIn ? checkIn.getTime() : null;
  
  // Parse check-out date and time
  const checkOut = visit.check_out ? new Date(visit.check_out) : null;
  const checkOutTimestamp = checkOut ? checkOut.getTime() : null;

  // Debug logging (remove after testing)
  console.log('Current time:', now.toLocaleString(), '| Timestamp:', currentTimestamp);
  if (checkIn) console.log('Check-in time:', checkIn.toLocaleString(), '| Timestamp:', checkInTimestamp);
  if (checkOut) console.log('Check-out time:', checkOut.toLocaleString(), '| Timestamp:', checkOutTimestamp);

  // If no check-in time, can't determine status
  if (!checkInTimestamp) return 'upcoming';

  // Completed: current time is at or past check-out time
  if (checkOutTimestamp && currentTimestamp >= checkOutTimestamp) {
    console.log('Status: COMPLETED');
    return 'completed';
  }
  
  // Ongoing: current time is at or past check-in (and before check-out or no check-out)
  if (currentTimestamp >= checkInTimestamp) {
    console.log('Status: ONGOING');
    return 'ongoing';
  }
  
  // Upcoming: current time is before check-in
  console.log('Status: UPCOMING');
  return 'upcoming';
};

export function VisitLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [logs, setLogs] = useState<Visit[]>([]);

  useEffect(() => {
    const fetchVisits = async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('*, visitor:visitors(name), host:hosts(name)')
        .eq('status', 'approved');
      if (error) {
        console.error('Error fetching visits:', error);
      } else {
        const formattedData: Visit[] = data.map((visit) => ({
          id: visit.id,
          visitor_name: visit.visitor.name,
          purpose: visit.purpose,
          host_name: visit.host.name,
          check_in: visit.check_in_time,
          check_out: visit.check_out_time,
          status: visit.status,
        }));
        setLogs(formattedData);
      }
    };

    fetchVisits();

    const subscription = supabase
      .channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visits' },
        (payload) => {
          console.log('Change received!', payload);
          fetchVisits(); // Refetch on change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filteredLogs = logs.filter(
    (log) =>
      (log.visitor_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.host_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Visit Logs</h1>
          <p className="mt-2 text-sm text-gray-700">
            A complete list of all campus visits including check-in and check-out times.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex flex-1 items-center justify-between mb-4">
          <div className="flex space-x-4 w-full max-w-2xl">
            <div className="flex-1">
              <label htmlFor="search" className="sr-only">
                Search
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="search"
                  className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-primary-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                  placeholder="Search visits"
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-48">
              <label htmlFor="dateFilter" className="sr-only">
                Filter by date
              </label>
              <input
                id="dateFilter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white py-2 px-3 leading-5 placeholder-gray-500 focus:border-primary-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                title="Select a date to filter visits"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                      >
                        Visitor
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Purpose</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Host</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Check In</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Check Out</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredLogs.map((log) => {
                      const dynamicStatus = getDynamicStatus(log);
                      return (
                        <tr key={log.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {log.visitor_name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{log.purpose}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{log.host_name}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {log.check_in ? new Date(log.check_in).toLocaleString() : '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {log.check_out ? new Date(log.check_out).toLocaleString() : '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <span
                              className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                dynamicStatus === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : dynamicStatus === 'ongoing'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {dynamicStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}