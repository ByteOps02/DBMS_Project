import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import Papa from 'papaparse';

type BulkUploadFormData = {
  file: FileList;
  hostEmail: string;
};

export function BulkVisitorUpload() {
  const { user } = useAuthStore();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<BulkUploadFormData>();
  const [uploading, setUploading] = useState(false);

  // Pre-fill host email if the current user is a host
  useState(() => {
    if (user?.role === 'host' && user.email) {
      setValue('hostEmail', user.email);
    }
  });

  const processCsv = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error) => reject(error),
      });
    });
  };

  const onSubmit = async (formData: BulkUploadFormData) => {
    setUploading(true);
    try {
      if (!user) {
        throw new Error('You must be logged in to upload visitors.');
      }

      const file = formData.file[0];
      if (!file) {
        throw new Error('Please select a file to upload.');
      }

      if (!formData.hostEmail) {
        throw new Error('Host email is required.');
      }

      // Resolve the host ID from the provided host email
      const { data: targetHost, error: targetHostError } = await supabase
        .from('hosts')
        .select('id')
        .eq('email', formData.hostEmail)
        .single();

      if (targetHostError || !targetHost) {
        throw new Error(`Host not found with email: ${formData.hostEmail}`);
      }

      const visitors = await processCsv(file);

      if (visitors.length === 0) {
        toast.error('The CSV file is empty or invalid.');
        setUploading(false);
        return;
      }

      const newVisitorsData: { name: string; email: string; phone: string; }[] = [];
      const existingVisitorEmails: string[] = [];

      visitors.forEach((visitor: any) => {
        if (visitor.email) {
          existingVisitorEmails.push(visitor.email);
        }
      });

      const { data: existingVisitors, error: existingVisitorsError } = await supabase
        .from('visitors')
        .select('id, email')
        .in('email', existingVisitorEmails);
      
      if (existingVisitorsError) throw existingVisitorsError;

      const existingVisitorsMap = new Map(existingVisitors?.map(v => [v.email, v.id]));

      const visitsToInsert: any[] = [];

      for (const visitorData of visitors) {
        let visitorId: string | undefined = existingVisitorsMap.get(visitorData.email);

        if (!visitorId) {
          newVisitorsData.push({
            name: visitorData.name,
            email: visitorData.email,
            phone: visitorData.phone || 'N/A',
          });
        }

        visitsToInsert.push({
          visitor_id: visitorId, // Temporary, will be updated after new visitors are inserted
          host_id: targetHost.id,
          purpose: visitorData.purpose || 'N/A',
          status: 'pending',
          valid_until: visitorData.valid_until ? new Date(visitorData.valid_until).toISOString() : new Date().toISOString(),
        });
      }

      // Insert new visitors
      if (newVisitorsData.length > 0) {
        const { data: insertedVisitors, error: insertVisitorsError } = await supabase
          .from('visitors')
          .insert(newVisitorsData)
          .select('id, email');

        if (insertVisitorsError) throw insertVisitorsError;

        insertedVisitors?.forEach(v => existingVisitorsMap.set(v.email, v.id));
      }

      // Update visitor_id for visitsToInsert
      visitsToInsert.forEach(visit => {
        if (!visit.visitor_id) {
          const originalVisitorData = visitors.find((v: any) => v.email === visit.email);
          if (originalVisitorData) {
            visit.visitor_id = existingVisitorsMap.get(originalVisitorData.email);
          }
        }
      });

      // Insert all visits in a batch
      const { error: visitsError } = await supabase.from('visits').insert(visitsToInsert);

      if (visitsError) {
        throw visitsError;
      }

      toast.success(`${visitors.length} visitors uploaded successfully!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload visitors.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Bulk Visitor Upload</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="hostEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Host Email</label>
          <input
            type="email"
            id="hostEmail"
            {...register('hostEmail', { required: 'Host email is required' })}
            disabled={user?.role === 'host'}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600"
          />
          {errors.hostEmail && <p className="mt-1 text-sm text-red-600">{errors.hostEmail.message}</p>}
        </div>

        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-700 dark:text-gray-300">CSV File</label>
          <input
            type="file"
            id="file"
            accept=".csv"
            {...register('file', { required: 'Please select a CSV file' })}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:text-gray-400 dark:file:bg-primary-900 dark:file:text-primary-300 dark:hover:file:bg-primary-800"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting || uploading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload Visitors'}
          </button>
        </div>
      </form>
      <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
        <h3 className="font-bold text-lg dark:text-white">CSV File Format</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Your CSV file should have the following columns:</p>
        <ul className="list-disc list-inside mt-2 text-sm text-gray-600 dark:text-gray-300">
          <li>`name` (required)</li>
          <li>`email` (required)</li>
          <li>`phone` (optional)</li>
          <li>`purpose` (optional, defaults to 'N/A')</li>
          <li>`valid_until` (optional, defaults to now)</li>
        </ul>
      </div>
    </div>
  );
}