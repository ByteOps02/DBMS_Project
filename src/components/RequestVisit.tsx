import React from 'react';
import { Camera } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import emailjs from '@emailjs/browser';
import { supabase } from '../lib/supabase';
import { BackButton } from './BackButton';

interface VisitorFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  purpose: string;
  entityEmail: string;
  checkInTime: string;
  checkOutTime: string;
  validUntil: string;
  notes: string;
  photo?: FileList;
}

export function RequestVisit() {
  const [formData, setFormData] = React.useState<VisitorFormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    purpose: '',
    entityEmail: '',
    checkInTime: '',
    checkOutTime: '',
    validUntil: '',
    notes: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState('');
  const [qrImageUrl, setQrImageUrl] = React.useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'file' && (e.target as HTMLInputElement).files) {
      setFormData(prev => ({ ...prev, photo: (e.target as HTMLInputElement).files! }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setQrImageUrl(null);

    try {
      let photoUrl = null;

      if (formData.photo?.[0]) {
        const file = formData.photo[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from('identification-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Photo upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('identification-images')
          .getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      let entityId = null;
      let hostName = null;
      if (formData.entityEmail && formData.entityEmail.trim() !== '') {
        const { data: entityData, error: entityError } = await supabase
          .from('hosts')
          .select('id, name')
          .eq('email', formData.entityEmail)
          .eq('role', 'host')
          .maybeSingle();

        if (entityError && entityError.code !== 'PGRST116') {
          throw new Error('Error looking up entity: ' + entityError.message);
        }

        if (entityData) {
          entityId = entityData.id;
          hostName = entityData.name;
        }
      }

      let visitorId;
      const { data: existingVisitor, error: visitorLookupError } = await supabase
        .from('visitors')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();

      if (visitorLookupError && visitorLookupError.code !== 'PGRST116') {
        throw visitorLookupError;
      }

      if (existingVisitor) {
        visitorId = existingVisitor.id;
        const { error: updateError } = await supabase
          .from('visitors')
          .update({
            name: formData.name,
            phone: formData.phone,
            company: formData.company || null,
            photo_url: photoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', visitorId);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { data: newVisitor, error: createError } = await supabase
          .from('visitors')
          .insert({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company: formData.company || null,
            photo_url: photoUrl,
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        visitorId = newVisitor.id;
      }

      const visitId = uuidv4();
      const { error: visitError } = await supabase.from('visits').insert({
        id: visitId,
        visitor_id: visitorId,
        host_id: entityId,
        purpose: formData.purpose,
        status: 'pending',
        check_in_time: formData.checkInTime ? new Date(formData.checkInTime).toISOString() : null,
        check_out_time: formData.checkOutTime ? new Date(formData.checkOutTime).toISOString() : null,
        valid_until: new Date(formData.validUntil).toISOString(),
        notes: formData.notes || null,
      });

      if (visitError) {
        throw visitError;
      }

      const qrGeneratedUrl = await QRCode.toDataURL(JSON.stringify({ visitId, name: formData.name }));
      setQrImageUrl(qrGeneratedUrl);

      await emailjs.send(
        'service_tmagvgd',
        'template_c4a4dpu',
        {
          to_name: formData.name,
          to_email: formData.email,
          qr_code: qrGeneratedUrl,
          visit_id: visitId,
          visit_purpose: formData.purpose,
          host_name: hostName || 'N/A',
          valid_until: new Date(formData.validUntil).toLocaleString(),
        },
        'ApAlChy6Mq77wiEue'
      );

      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        purpose: '',
        entityEmail: '',
        checkInTime: '',
        checkOutTime: '',
        validUntil: '',
        notes: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to request visit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto dark:bg-gray-900">
      <BackButton />
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Request a Visit</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Please fill in the details for your visit request.
            </p>
          </div>
        </div>
        
        <div className="mt-5 md:mt-0 md:col-span-2">
          <form onSubmit={handleSubmit}>
            <div className="shadow sm:rounded-md sm:overflow-hidden">
              <div className="px-4 py-5 bg-white dark:bg-gray-800 space-y-6 sm:p-6">
                {success && (
                  <div className="rounded-md bg-green-50 p-4 mb-4 dark:bg-green-900">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Visit requested successfully! An email with a QR code has been sent.
                        </p>
                      </div>
                    </div>
                    
                    {qrImageUrl && (
                      <div className="mt-4 flex justify-center">
                        <div className="p-2 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md shadow-sm">
                          <img src={qrImageUrl} alt="Visit QR Code" className="w-32 h-32" />
                          <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">QR Code for your visit</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="rounded-md bg-red-50 p-4 mb-4 dark:bg-red-900">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Visitor Information Section */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Visitor Information
                  </h4>
                  <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Full name
                      </label>
                      <input 
                        type="text" 
                        name="name" 
                        id="name" 
                        required 
                        value={formData.name} 
                        onChange={handleChange} 
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Email address
                      </label>
                      <input 
                        type="email" 
                        name="email" 
                        id="email" 
                        required 
                        value={formData.email} 
                        onChange={handleChange} 
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Phone number
                      </label>
                      <input 
                        type="tel" 
                        name="phone" 
                        id="phone" 
                        required 
                        value={formData.phone} 
                        onChange={handleChange} 
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Company
                      </label>
                      <input 
                        type="text" 
                        name="company" 
                        id="company" 
                        value={formData.company} 
                        onChange={handleChange} 
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Visitor Photo</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md dark:border-gray-600">
                      <div className="space-y-1 text-center">
                        <Camera className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                          <label htmlFor="photo" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                            <span>Upload a photo</span>
                            <input id="photo" name="photo" type="file" accept="image/*" className="sr-only" onChange={handleChange} />
                          </label>
                          {formData.photo && formData.photo.length > 0 && <span className="ml-2 text-gray-900 dark:text-white">{formData.photo[0].name}</span>}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG up to 10MB</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visit Information Section */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Visit Information
                  </h4>
                  <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-6">
                      <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Purpose of visit
                      </label>
                      <input 
                        type="text" 
                        name="purpose" 
                        id="purpose" 
                        required 
                        value={formData.purpose} 
                        onChange={handleChange} 
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                      />
                    </div>

                    <div className="col-span-6">
                      <label htmlFor="entityEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Host email
                      </label>
                      <input 
                        type="email" 
                        name="entityEmail" 
                        id="entityEmail" 
                        value={formData.entityEmail} 
                        onChange={handleChange} 
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Enter the email of the host associated with this visit
                      </p>
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="checkInTime" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Check-in time
                      </label>
                      <input 
                        type="datetime-local" 
                        name="checkInTime" 
                        id="checkInTime" 
                        value={formData.checkInTime} 
                        onChange={handleChange} 
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="checkOutTime" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Check-out time
                      </label>
                      <input 
                        type="datetime-local" 
                        name="checkOutTime" 
                        id="checkOutTime" 
                        value={formData.checkOutTime} 
                        onChange={handleChange} 
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Valid until
                      </label>
                      <input 
                        type="datetime-local" 
                        name="validUntil" 
                        id="validUntil" 
                        required 
                        value={formData.validUntil} 
                        onChange={handleChange} 
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                      />
                    </div>

                    <div className="col-span-6">
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Notes (optional)
                      </label>
                      <textarea 
                        name="notes" 
                        id="notes" 
                        rows={3} 
                        value={formData.notes} 
                        onChange={handleChange} 
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                      />
                    </div>
                  </div>
                </div>

                {/* QR Code Preview */}
                <div className="text-center">
                  {qrImageUrl && (
                    <div className="mt-6">
                      <h5 className="text-md font-medium text-gray-700 dark:text-gray-300">
                        Visitor's QR Code
                      </h5>
                      <img
                        src={qrImageUrl}
                        alt="QR Code"
                        className="mx-auto mt-3"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-right sm:px-6">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Requesting Visit...' : 'Request Visit'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}