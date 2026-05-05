import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useFormDirtyBlocker } from '@/hooks/useFormDirtyBlocker';
import { customerSchema } from '@/lib/validations/customers';
import { checkPhoneDuplicate, createCustomer, updateCustomer, getCustomerById } from '@/lib/db/customers';
import { supabase } from '@/lib/supabase/client';

export function CustomerFormPage() {
  const { customerId } = useParams();
  const isEdit = !!customerId;
  const navigate = useNavigate();
  const { tenantId } = useAuthStore(s => s.user!) || {};
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [checkingPhone, setCheckingPhone] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  const { register, handleSubmit, watch, reset, formState: { errors, isDirty, isSubmitting } } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      customer_type: 'individual',
      fleet_name: ''
    }
  });

  const { reset: resetBlocker } = useFormDirtyBlocker(isDirty);

  useQuery({
    queryKey: ['customer', customerId, tenantId],
    queryFn: async () => {
      if (!isEdit) return null;
      const data = await getCustomerById(customerId, tenantId!);
      reset({
        name: data.name,
        phone: data.phone,
        email: data.email || '',
        address: data.address || '',
        city: data.city || '',
        customer_type: data.customer_type as any,
        fleet_name: data.fleet_name || ''
      });
      return data;
    },
    enabled: !!tenantId && isEdit,
  });

  const customerType = watch('customer_type');
  const phoneVal = watch('phone');

  const handlePhoneBlur = async () => {
    if (!phoneVal || phoneVal.length < 7 || isEdit) return;
    
    setCheckingPhone(true);
    try {
      const existing = await checkPhoneDuplicate(phoneVal, tenantId!);
      if (existing) {
        setDuplicateWarning(existing);
      } else {
        setDuplicateWarning(null);
      }
    } catch (err) {
      console.error("Failed to check duplicate phone:", err);
    } finally {
      setCheckingPhone(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        return updateCustomer(customerId, data, tenantId!);
      } else {
        const result = await createCustomer(data, tenantId!);
        if (result.conflict) {
          throw new Error('DUPLICATE_WARNING');
        }
        return result.customer;
      }
    },
    onSuccess: (data) => {
      resetBlocker();
      showToast(`Customer ${isEdit ? 'updated' : 'added'} successfully`, 'success');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      }
      navigate(`/sales/customers/${isEdit ? customerId : data.id}`);
    },
    onError: (err: any) => {
      if (err.message === 'DUPLICATE_WARNING') {
        // Warning already shown by checkPhoneDuplicate in blur, or can be forced here
        // The spec says "Admin can still submit — duplicate is a warning not a block".
        // To allow forced submission, we could write a direct supabase insert bypassing the conflict check.
        // I will implement a bypass by updating the state.
        showToast('A customer with this phone number already exists.', 'warning');
      } else {
        showToast(err.message, 'error');
      }
    }
  });

  const forceSubmit = async (data: any) => {
    try {
      // Direct insert bypassing createCustomer conflict check
      const { data: customer, error } = await (supabase as any)
        .from('customers')
        .insert({ ...data, tenant_id: tenantId! })
        .select()
        .single();
        
      if (error) throw error;
      
      resetBlocker();
      showToast('Customer added successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      navigate(`/sales/customers/${customer.id}`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const onSubmit = (data: any) => {
    if (!isEdit && duplicateWarning) {
      forceSubmit(data);
    } else {
      mutation.mutate(data);
    }
  };

  return (
    <PageWrapper
      title={isEdit ? 'Edit Customer' : 'Add New Customer'}
      backLink={{ label: '← Back', path: isEdit ? `/sales/customers/${customerId}` : '/sales/customers' }}
    >
      <div className="max-w-2xl mx-auto pb-12">
        <Card className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Full name *</label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. John Doe"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone number *</label>
                <input
                  type="text"
                  {...register('phone')}
                  onBlur={(e) => {
                    register('phone').onBlur(e);
                    handlePhoneBlur();
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. +1 234 567 8900"
                />
                {errors.phone ? (
                  <p className="text-red-500 text-xs mt-1">{errors.phone.message as string}</p>
                ) : checkingPhone ? (
                  <p className="text-slate-400 text-xs mt-1">Checking phone...</p>
                ) : null}
                
                {duplicateWarning && !isEdit && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                    A customer with this phone number already exists: <strong>{duplicateWarning.name}</strong>.{' '}
                    <a href={`/sales/customers/${duplicateWarning.id}`} target="_blank" rel="noopener noreferrer" className="font-medium underline hover:text-amber-900">
                      View existing customer →
                    </a>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. john@example.com"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  {...register('address')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Street address, building, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  {...register('city')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="City"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">Customer type</label>
              <div className="flex flex-wrap gap-3">
                {['individual', 'fleet_owner', 'school', 'transporter'].map(type => (
                  <label key={type} className={`
                    flex-1 min-w-[120px] text-center px-4 py-2 rounded-md border cursor-pointer border-slate-200 transition-colors
                    ${customerType === type ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : 'bg-white text-slate-600 hover:bg-slate-50'}
                  `}>
                    <input type="radio" value={type} className="sr-only" {...register('customer_type')} />
                    <span className="capitalize">{type.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className={`transition-all duration-300 overflow-hidden ${customerType === 'fleet_owner' ? 'max-h-32 opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0 m-0 p-0'}`}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fleet / Company name *</label>
              <input
                type="text"
                {...register('fleet_name')}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Enter company name"
              />
              {errors.fleet_name && <p className="text-red-500 text-xs mt-1">{errors.fleet_name.message as string}</p>}
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <Link 
                to={isEdit ? `/sales/customers/${customerId}` : '/sales/customers'} 
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </Link>
              <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                {isSubmitting || mutation.isPending ? 'Saving...' : 'Save customer'}
              </Button>
            </div>

          </form>
        </Card>
      </div>
    </PageWrapper>
  );
}
