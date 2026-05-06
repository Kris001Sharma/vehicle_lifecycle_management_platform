import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Car, 
  Leaf, 
  Zap, 
  Flame, 
  ChevronRight, 
  CheckCircle2,
  Layers,
  Settings2
} from 'lucide-react';
import confetti from 'canvas-confetti';

const celebrate = () => {
  const duration = 2 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);
    const particleCount = 40 * (timeLeft / duration);
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
  }, 250);
};
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { useFormDirtyNavigation } from '@/hooks/useFormDirtyNavigation';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getVariantsForSale, checkVehicleNumberUnique, createVehicleSale } from '@/lib/db/vehicles';
import { getTenantCatalogConfig } from '@/lib/db/catalogV2';
import { searchCustomers, checkPhoneDuplicate, createCustomer } from '@/lib/db/customers';
import { SpecDisplay } from '@/components/catalog/SpecDisplay';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/utils/cn';

// Dummy implementation for logos/images until Cloudinary is ready
const MFR_LOGOS: Record<string, string> = {
  'Kia': 'https://images.unsplash.com/photo-1599305445671-ac291c95aba9?w=128&h=128&fit=crop&q=80',
  'Dongfeng': 'https://images.unsplash.com/photo-1599305445671-ac291c95aba9?w=128&h=128&fit=crop&q=80',
};

const MODEL_IMAGES: Record<string, string> = {
  'default': 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop&q=80',
};

export function NewSalePage() {
  const navigate = useNavigate();
  const { user, tenantId } = useAuthStore(s => ({ user: s.user!, tenantId: s.user!.tenantId! }));
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [selectionStep, setSelectionStep] = useState(1); // 1: Category, 2: Manufacturer, 3: Model, 4: Variant
  
  const [recordedSale, setRecordedSale] = useState<any>(null);

  // Selection State
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedColor, setSelectedColor] = useState<any>(null);

  // Step 2: Vehicle
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [registrationPlate, setRegistrationPlate] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleNotes, setSaleNotes] = useState('');
  const [vehicleNumberError, setVehicleNumberError] = useState('');

  // Step 3: Customer
  const [customerMode, setCustomerMode] = useState<'select' | 'new'>('select');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const debouncedCustomerSearch = useDebounce(customerSearch, 300);
  
  // New Customer Form
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [newCustType, setNewCustType] = useState('individual');
  const [newCustFleet, setNewCustFleet] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  // Form dirty state for navigation protection
  const isActuallyDirty = useMemo(() => {
    if (recordedSale) return false;
    return !!selectedCategory || !!vehicleNumber || !!selectedCustomer || !!newCustName || !!selectedModel || !!selectedVariant;
  }, [recordedSale, selectedCategory, vehicleNumber, selectedCustomer, newCustName, selectedModel, selectedVariant]);

  const { 
    shouldShowDialog, 
    handleConfirmNavigation, 
    handleCancelNavigation 
  } = useFormDirtyNavigation(isActuallyDirty);

  // Step 4: Features
  const [selectedOptionalFeatures, setSelectedOptionalFeatures] = useState<string[]>([]);
  
  // Queries
  const { data: config } = useQuery({
    queryKey: ['tenant_catalog_config', tenantId],
    queryFn: () => getTenantCatalogConfig(tenantId),
    enabled: !!tenantId,
  });

  const { data: categoriesWithModels, isLoading: isCatalogLoading } = useQuery({
    queryKey: ['variants_for_sale', tenantId],
    queryFn: () => getVariantsForSale(tenantId),
    enabled: !!tenantId,
  });

  const { data: customerData, isLoading: custSearchLoading } = useQuery({
    queryKey: ['customers', tenantId, debouncedCustomerSearch],
    queryFn: () => searchCustomers(debouncedCustomerSearch, tenantId, 1, 5),
    enabled: !!tenantId && debouncedCustomerSearch.length > 0 && customerMode === 'select' && !selectedCustomer,
  });

  const { data: variantFeatures } = useQuery({
    queryKey: ['variant_features', selectedVariant?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('variant_default_features')
        .select('feature:features(id, name, category), is_standard')
        .eq('variant_id', selectedVariant.id);
      return data || [];
    },
    enabled: !!selectedVariant?.id,
  });

  // Actions
  const handleVehicleNumberBlur = async () => {
    if (!vehicleNumber) return;
    const isUnique = await checkVehicleNumberUnique(vehicleNumber, tenantId);
    if (!isUnique) setVehicleNumberError('This vehicle number is already registered. Please verify and try again.');
    else setVehicleNumberError('');
  };

  const handlePhoneBlur = async () => {
    if (!newCustPhone || newCustPhone.length < 10) return;
    const existing = await checkPhoneDuplicate(newCustPhone, tenantId);
    setDuplicateWarning(existing || null);
  };

  const validateEmail = (email: string) => {
    if (!email) return true;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const saveNewCustomer = async () => {
    if (!newCustName || !newCustPhone) return;
    if (newCustType === 'fleet_owner' && !newCustFleet) {
      showToast('Fleet name is required', 'error');
      return;
    }
    try {
      const result = await createCustomer({
        name: newCustName,
        phone: newCustPhone,
        email: newCustEmail,
        customer_type: newCustType,
        fleet_name: newCustFleet
      }, tenantId);
      
      if (result.conflict) {
        setDuplicateWarning(result.existing);
      } else {
        setSelectedCustomer(result.customer);
        setCustomerMode('select');
        showToast('Customer added successfully', 'success');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleNext = () => {
    setStep(s => s + 1);
  };

  const recordSaleMutation = useMutation({
    mutationFn: async () => {
      return createVehicleSale({
        vehicle_number: vehicleNumber,
        chassis_number: chassisNumber,
        registration_plate: registrationPlate,
        sale_date: saleDate,
        sale_notes: selectedColor 
          ? `Selected Color: ${selectedColor.name} (${selectedColor.hex})\n${saleNotes}`
          : saleNotes,
        variant_id: selectedVariant.id,
        customer_id: selectedCustomer.id,
        status: 'active'
      }, selectedOptionalFeatures, tenantId, user.id);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      
      const vehicle = data.vehicle || { id: data.vehicleId };
      if (!vehicle.id && data.id) vehicle.id = data.id; // defensive
      
      setRecordedSale({ 
        ...vehicle, 
        tracking: `VLM-${Math.random().toString(36).substring(2, 9).toUpperCase()}` 
      });
      celebrate();
      showToast('Sale recorded successfully', 'success');
    },
    onError: (err: any) => showToast(err.message, 'error')
  });

  const formatPrice = (price: number) => {
    if (!config) return price.toLocaleString();
    const symbol = config.currency === 'USD' ? '$' : 
                   config.currency === 'EUR' ? '€' : 
                   config.currency === 'GBP' ? '£' : 
                   config.currency === 'INR' ? '₹' : 
                   config.currency === 'NPR' ? 'रू' : '';
    
    return `${symbol}${price.toLocaleString()}`;
  };

  const getPowertrainIcon = (slug: string) => {
    if (slug?.includes('ev') || slug?.includes('electric')) return <Zap className="w-4 h-4 text-emerald-500" />;
    if (slug?.includes('phev')) return <Leaf className="w-4 h-4 text-emerald-400" />;
    if (slug?.includes('diesel')) return <Flame className="w-4 h-4 text-orange-500" />;
    return <Layers className="w-4 h-4 text-slate-400" />;
  };

  const stepClasses = (s: number) => {
    if (step > s) return 'bg-indigo-600 text-white border-indigo-600';
    if (step === s) return 'bg-indigo-600 text-white border-indigo-600 ring-4 ring-indigo-100';
    return 'bg-slate-50 text-slate-500 border-slate-200';
  };

  const manufacturers = useMemo<string[]>(() => {
    if (!selectedCategory) return [];
    const set = new Set<string>(selectedCategory.models.map((m: any) => m.manufacturer));
    return Array.from(set).sort();
  }, [selectedCategory]);

  const filteredModels = useMemo<any[]>(() => {
    if (!selectedManufacturer) return [];
    return selectedCategory.models.filter((m: any) => m.manufacturer === selectedManufacturer);
  }, [selectedCategory, selectedManufacturer]);

  const standardFeaturesList = useMemo(() => variantFeatures?.filter((f: any) => f.is_standard) || [], [variantFeatures]);
  const optionalFeaturesList = useMemo(() => variantFeatures?.filter((f: any) => !f.is_standard) || [], [variantFeatures]);

  // Ref for auto-scrolling
  const scrollRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el && selectionStep === parseInt(id)) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const resetSelectionFrom = (level: number) => {
    if (level <= 1) { setSelectedCategory(null); }
    if (level <= 2) { setSelectedManufacturer(null); }
    if (level <= 3) { setSelectedModel(null); }
    if (level <= 4) { setSelectedVariant(null); setSelectedColor(null); }
    setSelectionStep(level);
  };

  return (
    <PageWrapper title="Record New Sale">
      <div className="max-w-4xl mx-auto pb-20">
        
        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-0.5 bg-slate-200 -z-10"></div>
            {[1, 2, 3, 4].map(num => (
              <div key={num} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm transition-colors border-2 ${stepClasses(num)}`}>
                  {step > num ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : num}
                </div>
                <span className={`text-xs font-medium uppercase tracking-wider ${step >= num ? 'text-indigo-900' : 'text-slate-400'}`}>
                  {num === 1 ? 'Variant' : num === 2 ? 'Details' : num === 3 ? 'Customer' : 'Confirm'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Selection Flow */}
        {step === 1 && (
          <div className="space-y-8 pb-10">
            {/* 1. Category Selection */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600 border border-indigo-100">1</div>
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Vehicle Category</h2>
              </div>
              
              {isCatalogLoading ? (
                <div className="h-32 flex items-center justify-center text-slate-400">
                  <div className="w-5 h-5 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mr-3" />
                  <span className="text-sm">Loading catalog...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {categoriesWithModels?.map((cat: any) => {
                    const hasVariants = cat.models.some((m: any) => m.variants && m.variants.length > 0);
                    const isSelected = selectedCategory?.id === cat.id;
                    return (
                      <button
                        key={cat.id}
                        disabled={!hasVariants}
                        onClick={() => { setSelectedCategory(cat); resetSelectionFrom(2); }}
                        className={cn(
                          "px-4 py-3 rounded-xl border transition-all text-sm font-medium flex items-center justify-center gap-2",
                          !hasVariants ? "opacity-40 cursor-not-allowed bg-slate-50 border-slate-100" : 
                          isSelected 
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" 
                            : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/30"
                        )}
                      >
                        {(cat.slug === 'passenger_car' || cat.slug === 'truck') && <Car className="w-4 h-4" />}
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Manufacturer Selection */}
            {selectedCategory && (
              <div 
                ref={scrollRef('2')}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div className="flex items-center gap-2 mb-4 px-1">
                  <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600 border border-indigo-100">2</div>
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Manufacturer</h2>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {manufacturers.map((mfr: string) => {
                    const isSelected = selectedManufacturer === mfr;
                    return (
                      <button
                        key={mfr}
                        onClick={() => { setSelectedManufacturer(mfr); resetSelectionFrom(3); }}
                        className={cn(
                          "aspect-square p-2 rounded-xl border transition-all flex flex-col items-center justify-center gap-2",
                          isSelected 
                            ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500" 
                            : "bg-white border-slate-100 hover:border-indigo-200"
                        )}
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-50 overflow-hidden flex items-center justify-center">
                          {MFR_LOGOS[mfr] ? (
                            <img src={MFR_LOGOS[mfr]} alt={mfr} className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0" />
                          ) : (
                            <span className="text-lg font-bold text-slate-300">{mfr[0]}</span>
                          )}
                        </div>
                        <span className={cn("text-xs font-bold truncate w-full px-1", isSelected ? "text-indigo-700" : "text-slate-600 whitespace-nowrap")}>{mfr}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Model Selection */}
            {selectedManufacturer && (
              <div 
                ref={scrollRef('3')}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div className="flex items-center gap-2 mb-4 px-1">
                  <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600 border border-indigo-100">3</div>
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Available Models</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {filteredModels.map((model: any) => {
                    const isSelected = selectedModel?.id === model.id;
                    return (
                      <button
                        key={model.id}
                        onClick={() => { setSelectedModel(model); resetSelectionFrom(4); }}
                        className={cn(
                          "group relative flex flex-col bg-white rounded-3xl border-2 transition-all overflow-hidden text-left",
                          isSelected 
                            ? "border-indigo-500 bg-indigo-50/10 shadow-xl shadow-indigo-500/10" 
                            : "border-slate-100 hover:border-indigo-200 hover:shadow-lg"
                        )}
                      >
                        <div className="aspect-[16/10] w-full bg-slate-100 overflow-hidden relative">
                          <img 
                            src={MODEL_IMAGES.default} 
                            alt={model.name} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                          />
                          <div className={cn(
                            "absolute inset-0 transition-opacity",
                            isSelected ? "bg-indigo-600/10" : "bg-black/0 group-hover:bg-black/5"
                          )} />
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-indigo-600 shadow-md flex items-center justify-center text-white z-10 animate-in zoom-in-50">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className={cn(
                            "text-lg font-bold transition-colors",
                            isSelected ? "text-indigo-900" : "text-slate-900"
                          )}>
                            {model.name}
                          </h3>
                          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1 font-semibold">
                            {model.subcategory?.replace('_', ' ')}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Variant Selection */}
            {selectedModel && (
              <div 
                ref={scrollRef('4')}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div className="flex items-center gap-2 mb-4 px-1">
                  <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600 border border-indigo-100">4</div>
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Select Variant</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedModel.variants.map((v: any) => {
                    const isSelected = selectedVariant?.id === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={cn(
                          "relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2",
                          isSelected 
                            ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500" 
                            : "bg-white border-slate-200 hover:border-indigo-200"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-slate-900">{v.name}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 border border-slate-100">
                            {getPowertrainIcon(v.powertrain?.slug)}
                            <span className="text-xs font-bold text-slate-600">{v.powertrain?.display_label}</span>
                          </div>
                          {v.price > 0 && (
                            <span className="text-sm font-black text-slate-900">
                              {formatPrice(v.price)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Configuration Summary - Refined for cohesion and functionality */}
            {selectedVariant && (
              <div className="animate-in fade-in zoom-in-95 duration-500 pt-4">
                <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Configuration Summary</h3>
                    </div>
                    <Badge variant="success" className="text-xs px-2 py-0.5">Ready to record</Badge>
                  </div>
                  
                    <div className="p-8">
                      {/* Condensed Header */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 pb-8 border-b border-slate-100">
                        <div className="flex flex-wrap gap-x-12 gap-y-6">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Model</p>
                            <p className="text-sm font-bold text-slate-900 uppercase">{selectedModel.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 uppercase">{selectedManufacturer}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Variant</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-900 uppercase">{selectedVariant.name}</p>
                              <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-100 grayscale opacity-60">
                                {getPowertrainIcon(selectedVariant.powertrain?.slug)}
                                <span className="text-[9px] font-bold text-slate-600 uppercase">{selectedVariant.powertrain.display_label}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="sm:text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Selling Price</p>
                          <p className="text-xl font-black text-indigo-600 tracking-tight">{formatPrice(selectedVariant.price)}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5 italic uppercase font-bold tracking-tighter">Ex-showroom cost</p>
                        </div>
                      </div>

                      <div className="space-y-10">
                        {/* Integrated Color & Specs */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                          {/* Color Selection */}
                          <div className="lg:col-span-5 space-y-4">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Select Exterior Color</h4>
                              <div className="h-px flex-grow bg-slate-100" />
                            </div>
                            
                            {selectedVariant.specs?.colour_options && Array.isArray(selectedVariant.specs.colour_options) && selectedVariant.specs.colour_options.length > 0 ? (
                              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                {selectedVariant.specs.colour_options.map((color: any, idx: number) => {
                                  const isSelected = selectedColor?.name === color.name;
                                  return (
                                    <div key={idx} className="flex flex-col items-center gap-1.5">
                                      <button 
                                        onClick={() => setSelectedColor(color)}
                                        className={cn(
                                          "group relative w-10 h-10 rounded-full border-4 transition-all hover:scale-110 flex items-center justify-center",
                                          isSelected
                                            ? "border-indigo-600 shadow-lg ring-4 ring-indigo-50" 
                                            : "border-white shadow-sm shadow-slate-200"
                                        )}
                                        style={{ backgroundColor: color.hex }}
                                      >
                                        {isSelected && (
                                          <CheckCircle2 className="w-4 h-4 text-white drop-shadow-sm" />
                                        )}
                                      </button>
                                      <span className={cn(
                                        "text-[8px] font-bold uppercase tracking-tighter text-center leading-tight transition-colors h-4 flex items-center",
                                        isSelected ? "text-indigo-600" : "text-slate-400"
                                      )}>
                                        {color.name}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed text-center">
                                <p className="text-[10px] text-slate-400 italic font-medium uppercase tracking-widest">No colors specified</p>
                              </div>
                            )}
                          </div>

                          {/* Unified Specifications */}
                          <div className="lg:col-span-7 space-y-4">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Specifications</h4>
                              <div className="h-px flex-grow bg-slate-100" />
                            </div>
                            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4">
                              <SpecDisplay
                                categorySlug={selectedCategory.slug}
                                subcategorySlug={selectedModel.subcategory}
                                powertrainSlug={selectedVariant.powertrain.slug}
                                specs={Object.fromEntries(
                                  Object.entries({
                                    ...selectedVariant.specs,
                                    warranty: `${selectedVariant.warranty_vehicle_yrs} Years`,
                                    model_year: selectedVariant.specs?.model_year || '2026'
                                  }).filter(([key]) => key !== 'colour_options' && key !== 'manufacturer')
                                )}
                                compact={true}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                </Card>

                <div className="flex justify-end mt-12">
                  <Button 
                    disabled={selectedVariant.specs?.colour_options?.length > 0 && !selectedColor}
                    onClick={handleNext}
                    className="px-10 shadow-lg shadow-indigo-600/10"
                  >
                    Continue to vehicle details
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="max-w-xl mx-auto space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Number *</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={e => { setVehicleNumber(e.target.value); setVehicleNumberError(''); }}
                    onBlur={handleVehicleNumberBlur}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="Enter unique vehicle number/VIN"
                  />
                  {vehicleNumberError && <p className="text-red-500 text-xs mt-1">{vehicleNumberError}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Registration Plate (Optional)</label>
                  <input
                    type="text"
                    value={registrationPlate}
                    onChange={e => setRegistrationPlate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                    placeholder="e.g. ABC 1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Chassis Number (Optional)</label>
                  <input
                    type="text"
                    value={chassisNumber}
                    onChange={e => setChassisNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sale Date *</label>
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={saleDate}
                    onChange={e => setSaleDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sale Notes (Optional)</label>
                  <textarea
                    value={saleNotes}
                    onChange={e => setSaleNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500"
                  ></textarea>
                </div>
              </div>
            </Card>
            <div className="flex justify-between items-center mt-8 gap-4">
              <Button 
                variant="secondary" 
                onClick={() => setStep(1)} 
                className="px-8 shadow-sm"
              >
                Back
              </Button>
              <Button 
                disabled={!vehicleNumber || !!vehicleNumberError || !saleDate} 
                onClick={handleNext} 
                className="px-10 shadow-lg shadow-indigo-600/10"
              >
                Continue to customer
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex bg-slate-100 p-1 rounded-md w-fit mb-6 mx-auto">
                <button
                  onClick={() => setCustomerMode('select')}
                  className={`px-4 py-2 text-sm font-medium rounded transition-colors ${customerMode === 'select' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                >Select existing</button>
                <button
                  onClick={() => setCustomerMode('new')}
                  className={`px-4 py-2 text-sm font-medium rounded transition-colors ${customerMode === 'new' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                >Add new customer</button>
              </div>

              <div className="max-w-xl mx-auto min-h-[300px]">
                {customerMode === 'select' ? (
                  <div className="space-y-4">
                    {selectedCustomer ? (
                      <div className="p-4 border border-indigo-200 bg-indigo-50 rounded-xl relative">
                        <Button variant="ghost" size="sm" className="absolute top-3 right-3 text-indigo-600 hover:bg-indigo-100" onClick={() => setSelectedCustomer(null)}>Change</Button>
                        <div className="font-semibold text-slate-900 mb-1">{selectedCustomer.name}</div>
                        <Badge variant="neutral" className="mb-3 capitalize">{selectedCustomer.customer_type.replace('_', ' ')}</Badge>
                        <div className="text-sm text-slate-600">{selectedCustomer.phone}</div>
                        {selectedCustomer.email && <div className="text-sm text-slate-600">{selectedCustomer.email}</div>}
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={e => setCustomerSearch(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500"
                          placeholder="Search by name or phone"
                        />
                        {debouncedCustomerSearch.length > 0 && (
                          <div className="border border-slate-100 rounded-md divide-y divide-slate-100 max-h-64 overflow-y-auto shadow-sm">
                            {custSearchLoading ? (
                              <div className="p-4 text-center text-sm text-slate-500">Searching...</div>
                            ) : customerData?.rows && customerData.rows.length > 0 ? (
                              customerData.rows.map((c: any) => (
                                <div key={c.id} onClick={() => setSelectedCustomer(c)} className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center">
                                  <div>
                                    <div className="font-medium text-slate-900">{c.name}</div>
                                    <div className="text-xs text-slate-500">{c.phone}</div>
                                  </div>
                                  <Badge variant="neutral" className="capitalize text-xs">{c.customer_type.replace('_',' ')}</Badge>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-sm text-slate-500">
                                No customers found. Switch to 'Add new customer' to create one.
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                      <input type="text" value={newCustName} onChange={e => setNewCustName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                      <input 
                        type="text" 
                        value={newCustPhone} 
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setNewCustPhone(val); 
                          setDuplicateWarning(null);
                        }} 
                        onBlur={handlePhoneBlur} 
                        placeholder="10-digit mobile number"
                        className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500" 
                      />
                      {duplicateWarning && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                          A customer with this phone number already exists: <strong>{duplicateWarning.name}</strong>.
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input 
                        type="email" 
                        value={newCustEmail} 
                        onChange={e => {
                          const val = e.target.value;
                          setNewCustEmail(val);
                          if (val && !validateEmail(val)) {
                            setEmailError('Please enter a valid email address');
                          } else {
                            setEmailError('');
                          }
                        }} 
                        placeholder="customer@example.com"
                        className={cn(
                          "w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500",
                          emailError ? "border-red-300 bg-red-50" : "border-slate-200"
                        )}
                      />
                      {emailError && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase">{emailError}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                      <select value={newCustType} onChange={e => setNewCustType(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500">
                        <option value="individual">Individual</option>
                        <option value="fleet_owner">Fleet Owner</option>
                        <option value="school">School</option>
                        <option value="transporter">Transporter</option>
                      </select>
                    </div>
                    {newCustType === 'fleet_owner' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fleet Name *</label>
                        <input type="text" value={newCustFleet} onChange={e => setNewCustFleet(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    )}
                    <div className="pt-4 flex justify-end">
                      <Button onClick={saveNewCustomer} disabled={!newCustName || newCustPhone.length < 10 || !!emailError || (newCustType === 'fleet_owner' && !newCustFleet)}>Save customer</Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
            <div className="flex justify-between items-center mt-8">
              <Button 
                variant="secondary" 
                onClick={() => setStep(2)} 
                className="px-8 shadow-sm"
              >
                Back
              </Button>
              <Button 
                disabled={!selectedCustomer} 
                onClick={handleNext} 
                className="px-10 shadow-lg shadow-indigo-600/10"
              >
                Continue to confirm
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-2 border-b border-slate-100 pb-2">Optional add-on features</h2>
              <p className="text-sm text-slate-500 mb-6">Standard features are always included. Select any optional features the customer is purchasing.</p>
              
              {optionalFeaturesList.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 bg-slate-50 text-center rounded-md">No optional add-ons defined for this variant.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {optionalFeaturesList.map((f: any) => (
                    <label key={f.feature.id} className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${selectedOptionalFeatures.includes(f.feature.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                      <div className="flex items-center h-5">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                          checked={selectedOptionalFeatures.includes(f.feature.id)}
                          onChange={e => {
                            if (e.target.checked) setSelectedOptionalFeatures([...selectedOptionalFeatures, f.feature.id]);
                            else setSelectedOptionalFeatures(selectedOptionalFeatures.filter(id => id !== f.feature.id));
                          }}
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <span className="font-medium text-slate-900">{f.feature.name}</span>
                        <div className="text-slate-500 text-xs mt-0.5">{f.feature.category}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {standardFeaturesList.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h3 className="text-sm font-medium text-slate-700 mb-3 block">Included as standard</h3>
                  <div className="flex flex-wrap gap-2">
                    {standardFeaturesList.map((f: any) => (
                      <span key={f.feature.id} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                        {f.feature.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Sale Summary</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Vehicle Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Variant</span><span className="font-medium">{selectedVariant.name}</span></div>
                    {selectedColor && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Color</span>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: selectedColor.hex }} />
                          <span className="font-medium">{selectedColor.name}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between"><span className="text-slate-500">Model</span><span className="font-medium">{selectedModel.manufacturer} {selectedModel.name}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Powertrain</span><span className="font-medium">{selectedVariant.powertrain.display_label}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Vehicle No.</span><span className="font-mono font-medium">{vehicleNumber}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Sale Date</span><span className="font-medium">{new Date(saleDate).toLocaleDateString()}</span></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Customer</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium">{selectedCustomer.name}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-medium">{selectedCustomer.phone}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-medium capitalize">{selectedCustomer.customer_type.replace('_',' ')}</span></div>
                  </div>
                </div>
              </div>
            </Card>

              <div className="flex justify-between items-center gap-4">
                <Button variant="secondary" onClick={() => setStep(3)} className="px-8 shadow-sm">
                  Back
                </Button>
                <Button 
                  className="w-full md:w-auto px-12 shadow-lg shadow-indigo-600/20" 
                  onClick={() => recordSaleMutation.mutate()} 
                  disabled={recordSaleMutation.isPending}
                >
                  {recordSaleMutation.isPending ? 'Recording...' : 'Record sale'}
                </Button>
              </div>

              {/* Success Dialog */}
              {recordedSale && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                  <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 text-center relative overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    <div className="absolute -top-16 -right-16 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50" />
                    <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-purple-50 rounded-full blur-3xl opacity-50" />

                    <div className="relative">
                      <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-200 rotate-3 animate-bounce">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                      </div>
                      
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Confirmation!</h2>
                      <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                        The sale has been successfully recorded. Everything is set for delivery.
                      </p>

                      <div className="bg-slate-50 rounded-2xl p-4 mb-8 border border-slate-100 group relative">
                        <div className="absolute inset-0 bg-indigo-500/3 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tracking Code</p>
                        <p className="text-xl font-mono font-bold text-indigo-600 tracking-tighter">{recordedSale.tracking}</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button 
                          onClick={() => navigate(`/sales/vehicles/${recordedSale.id}`)}
                          className="w-full h-12 text-sm font-bold shadow-lg shadow-indigo-100"
                        >
                          View Vehicle Details
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => navigate('/sales/vehicles')}
                          className="w-full h-10 text-slate-500 font-bold hover:text-slate-900 hover:bg-slate-50 text-sm"
                        >
                          Go to fleet dashboard
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
        )}

        {/* Global Confirmation Dialog for Navigation */}
        <ConfirmDialog
          isOpen={shouldShowDialog}
          onClose={handleCancelNavigation}
          onConfirm={handleConfirmNavigation}
          title="Unsaved Changes"
          message="You have an ongoing sale configuration. Leaving this page will discard all progress and entered details. Are you sure you want to cancel?"
          confirmLabel="Discard & Leave"
          confirmVariant="destructive"
        />

      </div>
    </PageWrapper>
  );
}
