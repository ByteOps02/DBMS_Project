import React from 'react';
import { Camera } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import emailjs from '@emailjs/browser';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface RegisterVisitorData {
  name: string;
  email: string;
  phone: string;
  purpose: string;
  hostEmail: string;
  validUntil: string;
  photo: FileList | null;
}

export function RegisterVisitor() {
  const [formData, setFormData] = React.useState<RegisterVisitorData>({
    name: '',
    email: '',
    phone: '',
    purpose: '',
    hostEmail: '',
    validUntil: '',
    photo: null,
  });
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState('');
  const [qrImageUrl, setQrImageUrl] = React.useState<string | null>(null); // State to store QR code image URL

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, files } = e.target;
    if (type === 'file' && files) {
      setFormData(prev => ({ ...prev, photo: files }));
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
      // 1. Find the host
      const { data: hostData, error: hostError } = await supabase
        .from('hosts')
        .select('id, name')
        .eq('email', formData.hostEmail)
        .single();

      if (hostError || !hostData) {
        throw new Error(`Host not found with email: ${formData.hostEmail}`);
      }
      const hostId = hostData.id;
      const hostName = hostData.name;

      // 2. Find or create the visitor
      let visitorId: string;
      let photoUrl: string | null = null;

      const { data: existingVisitor, error: visitorLookupError } = await supabase
        .from('visitors')
        .select('id, photo_url')
        .eq('email', formData.email)
        .single();

      if (visitorLookupError && visitorLookupError.code !== 'PGRST116') {
        throw visitorLookupError;
      }

      if (existingVisitor) {
        visitorId = existingVisitor.id;
        photoUrl = existingVisitor.photo_url; // Use existing photo_url if no new photo upload
      } else {
        // Upload photo if provided for new visitor
        if (formData.photo && formData.photo.length > 0) {
          const file = formData.photo[0];
          const fileExt = file.name.split('.').pop();
          const fileName = `${uuidv4()}.${fileExt}`;
          const filePath = `visitor_photos/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('visitor-photos')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.warn('Error uploading photo:', uploadError);
          } else {
            photoUrl = supabase.storage.from('visitor-photos').getPublicUrl(filePath).data?.publicUrl || null;
          }
        }

        const { data: newVisitor, error: newVisitorError } = await supabase
          .from('visitors')
          .insert({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            photo_url: photoUrl, // Store photo URL with the visitor
          })
          .select('id')
          .single();

        if (newVisitorError) {
          throw newVisitorError;
        }
        visitorId = newVisitor.id;
      }

      // If new photo is provided for an existing visitor, update photo_url
      if (existingVisitor && formData.photo && formData.photo.length > 0) {
        const file = formData.photo[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `visitor_photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('visitor-photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true, // Upsert to overwrite if exists
          });

        if (uploadError) {
          console.warn('Error uploading new photo for existing visitor:', uploadError);
        } else {
          const newPhotoUrl = supabase.storage.from('visitor-photos').getPublicUrl(filePath).data?.publicUrl || null;
          const { error: updatePhotoError } = await supabase
            .from('visitors')
            .update({ photo_url: newPhotoUrl })
            .eq('id', visitorId);
          if (updatePhotoError) console.error('Error updating visitor photo URL:', updatePhotoError);
          photoUrl = newPhotoUrl;
        }
      }

      // 3. Create the visit record
      const visitId = uuidv4(); // Unique ID for the visit itself
      const visitDataToInsert = {
        id: visitId,
        visitor_id: visitorId,
        host_id: hostId,
        purpose: formData.purpose,
        status: 'pending',
        valid_until: new Date(formData.validUntil).toISOString(),
        // check_in_time and check_out_time are updated when status changes
      };
      console.log("Attempting to insert visit with data:", visitDataToInsert);
      const { error: visitError } = await supabase.from('visits').insert(visitDataToInsert);

      if (visitError) {
        throw visitError;
      }

      // 4. Generate QR code
      const qrGeneratedUrl = await QRCode.toDataURL(JSON.stringify({
        visitId,
        name: formData.name,
        email: formData.email,
        purpose: formData.purpose,
        validUntil: formData.validUntil,
        hostName: hostName,
      }));
      setQrImageUrl(qrGeneratedUrl);
      
      // 5. Send email with QR code
      const emailResult = await emailjs.send(
        'service_tmagvgd', // Your EmailJS Service ID
        'template_c4a4dpu', // Your EmailJS template ID
        {
          to_name: formData.name,
          to_email: formData.email,
          qr_code: qrGeneratedUrl,
          visit_id: visitId,
          visit_purpose: formData.purpose,
          host_name: hostName,
          valid_until: new Date(formData.validUntil).toLocaleString(),
        },
        'ApAlChy6Mq77wiEue' // Your EmailJS Public Key
      );

      if (emailResult.status !== 200) {
        console.warn('Email sending failed with status:', emailResult.status);
      }
      
      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        purpose: '',
        hostEmail: '',
        validUntil: '',
        photo: null,
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to register visitor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto dark:bg-gray-900 dark:text-gray-200">
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Register New Visitor</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Please fill in the visitor's details and take their photo for security purposes.
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
                          Visitor registration successful! An email with QR code has been sent to the visitor.
                        </p>
                      </div>
                    </div>
                    
                    {qrImageUrl && (
                      <div className="mt-4 flex justify-center">
                        <div className="p-2 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md shadow-sm">
                          <img src={qrImageUrl} alt="Visitor QR Code" className="w-32 h-32" />
                          <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">QR Code for visitor</p>
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

                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                    <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                    <label htmlFor="hostEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Host email
                    </label>
                    <input
                      type="email"
                      name="hostEmail"
                      id="hostEmail"
                      required
                      value={formData.hostEmail}
                      onChange={handleChange}
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Visitor Photo</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md dark:border-gray-600">
                    <div className="space-y-1 text-center">
                      <Camera className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600 dark:text-gray-400">
                        <label
                          htmlFor="photo"
                          className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                        >
                          <span>Take photo</span>
                          <input 
                            id="photo" 
                            name="photo" 
                            type="file" 
                            accept="image/*"
                            className="sr-only"
                            onChange={handleChange}
                          />
                        </label>
                        {formData.photo && formData.photo.length > 0 && <span className="ml-2 text-gray-900 dark:text-white">{formData.photo[0].name}</span>}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG up to 10MB</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-right sm:px-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Registering...' : 'Register Visitor'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
