import { z } from 'zod';

export interface SpecField {
  key: string;
  label: string;
  type: 'number' | 'text' | 'select' | 'boolean' | 'multiselect';
  unit?: string;
  options?: { value: string; label: string }[];
  required: boolean;
  group: string;
}

const COMMON_FIELDS: SpecField[] = [
  { key: 'manufacturer', label: 'Manufacturer', type: 'text', required: true, group: 'General' },
  { key: 'model_year', label: 'Model Year', type: 'number', required: true, group: 'General' },
  { key: 'wheelbase_mm', label: 'Wheelbase', type: 'number', unit: 'mm', required: false, group: 'Dimensions' },
  { key: 'length_mm', label: 'Length', type: 'number', unit: 'mm', required: false, group: 'Dimensions' },
  { key: 'width_mm', label: 'Width', type: 'number', unit: 'mm', required: false, group: 'Dimensions' },
  { key: 'height_mm', label: 'Height', type: 'number', unit: 'mm', required: false, group: 'Dimensions' },
  { key: 'kerb_weight_kg', label: 'Kerb Weight', type: 'number', unit: 'kg', required: false, group: 'Weights' },
  { key: 'tyre_size_front', label: 'Tyre Size (Front)', type: 'text', required: false, group: 'Weights' },
  { key: 'tyre_size_rear', label: 'Tyre Size (Rear)', type: 'text', required: false, group: 'Weights' },
  { key: 'colour_options', label: 'Colour Options', type: 'multiselect', required: false, group: 'General' },
];

const CATEGORY_FIELDS: Record<string, SpecField[]> = {
  'two-wheeler': [
    { key: 'engine_displacement_cc', label: 'Engine Displacement', type: 'number', unit: 'cc', required: false, group: 'Engine' },
    { key: 'seat_height_mm', label: 'Seat Height', type: 'number', unit: 'mm', required: false, group: 'Dimensions' },
    { key: 'ground_clearance_mm', label: 'Ground Clearance', type: 'number', unit: 'mm', required: false, group: 'Dimensions' },
  ],
  'three-wheeler': [
    { key: 'payload_kg', label: 'Payload', type: 'number', unit: 'kg', required: false, group: 'Weights' },
    { key: 'passenger_capacity', label: 'Passenger Capacity', type: 'number', required: false, group: 'Capacity' },
    { 
      key: 'body_type', 
      label: 'Body Type', 
      type: 'select', 
      options: [
        { value: 'passenger', label: 'Passenger' },
        { value: 'cargo', label: 'Cargo' },
        { value: 'mixed', label: 'Mixed' }
      ], 
      required: false, 
      group: 'Body' 
    },
  ],
  'passenger-car': [
    { key: 'boot_space_litres', label: 'Boot Space', type: 'number', unit: 'litres', required: false, group: 'Capacity' },
    { key: 'ground_clearance_mm', label: 'Ground Clearance', type: 'number', unit: 'mm', required: false, group: 'Dimensions' },
    { key: 'ncap_rating', label: 'NCAP Rating', type: 'number', required: false, group: 'Safety' },
    { key: 'airbag_count', label: 'Airbag Count', type: 'number', required: false, group: 'Safety' },
    { key: 'sunroof', label: 'Sunroof', type: 'boolean', required: false, group: 'Comfort' },
  ],
  'lcv': [
    { key: 'payload_kg', label: 'Payload', type: 'number', unit: 'kg', required: false, group: 'Weights' },
    { 
      key: 'body_type', 
      label: 'Body Type', 
      type: 'select', 
      options: [
        { value: 'flatbed', label: 'Flatbed' },
        { value: 'box', label: 'Box' },
        { value: 'tipper', label: 'Tipper' },
        { value: 'van', label: 'Van' },
        { value: 'minibus', label: 'Minibus' }
      ], 
      required: false, 
      group: 'Body' 
    },
    { key: 'number_of_axles', label: 'Number of Axles', type: 'number', required: false, group: 'Body' },
    { key: 'towing_capacity_kg', label: 'Towing Capacity', type: 'number', unit: 'kg', required: false, group: 'Weights' },
  ],
  'hcv': [
    { 
      key: 'body_type', 
      label: 'Body Type', 
      type: 'select', 
      options: [
        { value: 'flatbed', label: 'Flatbed' },
        { value: 'box', label: 'Box' },
        { value: 'tipper', label: 'Tipper' },
        { value: 'tanker', label: 'Tanker' },
        { value: 'bus-city', label: 'City Bus' },
        { value: 'bus-intercity', label: 'Intercity Bus' },
        { value: 'school-bus', label: 'School Bus' }
      ], 
      required: false, 
      group: 'Body' 
    },
    { key: 'number_of_axles', label: 'Number of Axles', type: 'number', required: false, group: 'Body' },
    { key: 'towing_capacity_kg', label: 'Towing Capacity', type: 'number', unit: 'kg', required: false, group: 'Weights' },
    { 
      key: 'floor_type', 
      label: 'Floor Type', 
      type: 'select', 
      options: [
        { value: 'low-floor', label: 'Low Floor' },
        { value: 'high-floor', label: 'High Floor' }
      ], 
      required: false, 
      group: 'Body' 
    },
    { key: 'standing_capacity', label: 'Standing Capacity', type: 'number', required: false, group: 'Capacity' },
  ],
  'construction-special': [
    { key: 'equipment_type', label: 'Equipment Type', type: 'text', required: false, group: 'General' },
    { key: 'operating_weight_kg', label: 'Operating Weight', type: 'number', unit: 'kg', required: false, group: 'Weights' },
    { key: 'bucket_capacity_m3', label: 'Bucket Capacity', type: 'number', unit: 'm3', required: false, group: 'Capacity' },
  ],
};

const POWERTRAIN_FIELDS: Record<string, SpecField[]> = {
  'petrol': [
    { key: 'engine_displacement_cc', label: 'Engine Displacement', type: 'number', unit: 'cc', required: false, group: 'Engine' },
    { key: 'max_power_bhp', label: 'Max Power', type: 'number', unit: 'bhp', required: false, group: 'Engine' },
    { key: 'max_power_kw', label: 'Max Power', type: 'number', unit: 'kW', required: false, group: 'Engine' },
    { key: 'max_torque_nm', label: 'Max Torque', type: 'number', unit: 'Nm', required: false, group: 'Engine' },
    { key: 'fuel_tank_litres', label: 'Fuel Tank Capacity', type: 'number', unit: 'L', required: false, group: 'Fuel & Transmission' },
    { 
      key: 'transmission', 
      label: 'Transmission', 
      type: 'select', 
      options: [
        { value: 'manual', label: 'Manual' },
        { value: 'automatic', label: 'Automatic' },
        { value: 'cvt', label: 'CVT' },
        { value: 'amt', label: 'AMT' },
        { value: 'dct', label: 'DCT' }
      ], 
      required: false, 
      group: 'Fuel & Transmission' 
    },
    { key: 'emission_standard', label: 'Emission Standard', type: 'text', required: false, group: 'General' },
    { key: 'fuel_efficiency_kmpl', label: 'Fuel Efficiency', type: 'number', unit: 'kmpl', required: false, group: 'Fuel & Transmission' },
  ],
  'diesel': [
    { key: 'engine_displacement_cc', label: 'Engine Displacement', type: 'number', unit: 'cc', required: false, group: 'Engine' },
    { key: 'max_power_bhp', label: 'Max Power', type: 'number', unit: 'bhp', required: false, group: 'Engine' },
    { key: 'max_power_kw', label: 'Max Power', type: 'number', unit: 'kW', required: false, group: 'Engine' },
    { key: 'max_torque_nm', label: 'Max Torque', type: 'number', unit: 'Nm', required: false, group: 'Engine' },
    { key: 'fuel_tank_litres', label: 'Fuel Tank Capacity', type: 'number', unit: 'L', required: false, group: 'Fuel & Transmission' },
    { 
      key: 'transmission', 
      label: 'Transmission', 
      type: 'select', 
      options: [
        { value: 'manual', label: 'Manual' },
        { value: 'automatic', label: 'Automatic' },
        { value: 'cvt', label: 'CVT' },
        { value: 'amt', label: 'AMT' },
        { value: 'dct', label: 'DCT' }
      ], 
      required: false, 
      group: 'Fuel & Transmission' 
    },
    { key: 'emission_standard', label: 'Emission Standard', type: 'text', required: false, group: 'General' },
    { key: 'fuel_efficiency_kmpl', label: 'Fuel Efficiency', type: 'number', unit: 'kmpl', required: false, group: 'Fuel & Transmission' },
  ],
  'electric': [
    { key: 'motor_power_kw', label: 'Motor Power', type: 'number', unit: 'kW', required: true, group: 'Motor & Battery' },
    { key: 'battery_capacity_kwh', label: 'Battery Capacity', type: 'number', unit: 'kWh', required: true, group: 'Motor & Battery' },
    { key: 'wltp_range_km', label: 'WLTP Range', type: 'number', unit: 'km', required: false, group: 'Range & Charging' },
    { key: 'ac_charge_time_hrs', label: 'AC Charge Time', type: 'number', unit: 'hrs', required: false, group: 'Range & Charging' },
    { key: 'dc_charge_time_mins', label: 'DC Charge Time', type: 'number', unit: 'mins', required: false, group: 'Range & Charging' },
    { 
      key: 'connector_type', 
      label: 'Connector Type', 
      type: 'select', 
      options: [
        { value: 'CCS2', label: 'CCS2' },
        { value: 'CHAdeMO', label: 'CHAdeMO' },
        { value: 'Type2', label: 'Type2' },
        { value: 'GB/T', label: 'GB/T' },
        { value: 'Proprietary', label: 'Proprietary' }
      ], 
      required: false, 
      group: 'Range & Charging' 
    },
    { key: 'warranty_battery_yrs', label: 'Battery Warranty (Years)', type: 'number', required: false, group: 'Warranty' },
    { key: 'warranty_battery_capacity_pct', label: 'Battery Warranty Capacity (%)', type: 'number', required: false, group: 'Warranty' },
  ],
  'phev': [
    { key: 'electric_motor_kw', label: 'Electric Motor Power', type: 'number', unit: 'kW', required: false, group: 'Motor & Battery' },
    { key: 'battery_capacity_kwh', label: 'Battery Capacity', type: 'number', unit: 'kWh', required: false, group: 'Motor & Battery' },
    { key: 'electric_range_km', label: 'Electric Range', type: 'number', unit: 'km', required: false, group: 'Range & Charging' },
    { key: 'engine_displacement_cc', label: 'Engine Displacement', type: 'number', unit: 'cc', required: false, group: 'Engine' },
    { key: 'combined_power_bhp', label: 'Combined Power', type: 'number', unit: 'bhp', required: false, group: 'Engine' },
    { key: 'fuel_tank_litres', label: 'Fuel Tank Capacity', type: 'number', unit: 'L', required: false, group: 'Fuel & Transmission' },
    { key: 'ac_charge_time_hrs', label: 'AC Charge Time', type: 'number', unit: 'hrs', required: false, group: 'Range & Charging' },
    { key: 'connector_type', label: 'Connector Type', type: 'text', required: false, group: 'Range & Charging' },
  ],
  'hev': [
    { key: 'engine_displacement_cc', label: 'Engine Displacement', type: 'number', unit: 'cc', required: false, group: 'Engine' },
    { key: 'max_power_bhp', label: 'Max Power', type: 'number', unit: 'bhp', required: false, group: 'Engine' },
    { key: 'hybrid_motor_kw', label: 'Hybrid Motor Power', type: 'number', unit: 'kW', required: false, group: 'Motor & Battery' },
    { key: 'fuel_tank_litres', label: 'Fuel Tank Capacity', type: 'number', unit: 'L', required: false, group: 'Fuel & Transmission' },
    { key: 'fuel_efficiency_kmpl', label: 'Fuel Efficiency', type: 'number', unit: 'kmpl', required: false, group: 'Fuel & Transmission' },
  ],
  'mhev': [
    { key: 'engine_displacement_cc', label: 'Engine Displacement', type: 'number', unit: 'cc', required: false, group: 'Engine' },
    { key: 'max_power_bhp', label: 'Max Power', type: 'number', unit: 'bhp', required: false, group: 'Engine' },
    { key: 'hybrid_motor_kw', label: 'Hybrid Motor Power', type: 'number', unit: 'kW', required: false, group: 'Motor & Battery' },
    { key: 'fuel_tank_litres', label: 'Fuel Tank Capacity', type: 'number', unit: 'L', required: false, group: 'Fuel & Transmission' },
    { key: 'fuel_efficiency_kmpl', label: 'Fuel Efficiency', type: 'number', unit: 'kmpl', required: false, group: 'Fuel & Transmission' },
  ],
  'cng': [
    { key: 'engine_displacement_cc', label: 'Engine Displacement', type: 'number', unit: 'cc', required: false, group: 'Engine' },
    { key: 'max_power_bhp', label: 'Max Power', type: 'number', unit: 'bhp', required: false, group: 'Engine' },
    { key: 'cng_tank_capacity_kg', label: 'CNG Tank Capacity', type: 'number', unit: 'kg', required: false, group: 'Fuel & Transmission' },
    { key: 'petrol_tank_litres', label: 'Petrol Tank Capacity (Dual-Fuel)', type: 'number', unit: 'L', required: false, group: 'Fuel & Transmission' },
    { key: 'fuel_efficiency_km_per_kg', label: 'Fuel Efficiency', type: 'number', unit: 'km/kg', required: false, group: 'Fuel & Transmission' },
  ],
  'lpg': [
    { key: 'engine_displacement_cc', label: 'Engine Displacement', type: 'number', unit: 'cc', required: false, group: 'Engine' },
    { key: 'max_power_bhp', label: 'Max Power', type: 'number', unit: 'bhp', required: false, group: 'Engine' },
    { key: 'lpg_tank_capacity_litres', label: 'LPG Tank Capacity', type: 'number', unit: 'L', required: false, group: 'Fuel & Transmission' },
  ],
  'hydrogen': [
    { key: 'motor_power_kw', label: 'Motor Power', type: 'number', unit: 'kW', required: false, group: 'Motor & Battery' },
    { key: 'hydrogen_tank_capacity_kg', label: 'Hydrogen Tank Capacity', type: 'number', unit: 'kg', required: false, group: 'Fuel & Transmission' },
    { key: 'wltp_range_km', label: 'WLTP Range', type: 'number', unit: 'km', required: false, group: 'Range & Charging' },
  ],
};

// Helper: duplicates a common field but mark it optional/required for specific cases if needed
// Actually, I'll just use them as they are defined.

export function getSpecFields(categorySlug: string, powertrainSlug: string): SpecField[] {
  const common = [...COMMON_FIELDS];
  const categoryFields = CATEGORY_FIELDS[categorySlug] || [];
  const powertrainFields = POWERTRAIN_FIELDS[powertrainSlug] || [];

  // Merge them, avoiding duplicate keys (some might overlap, e.g. displacement)
  const allFields = [...common, ...categoryFields, ...powertrainFields];
  const uniqueFields: SpecField[] = [];
  const keys = new Set<string>();

  for (const field of allFields) {
    if (!keys.has(field.key)) {
      uniqueFields.push(field);
      keys.add(field.key);
    }
  }

  // Adjust for bus variants in HCV
  if (categorySlug === 'hcv') {
      // If we had the data here, we'd filter floor_type/standing_capacity.
      // But we'll handle that filtering in the UI layer based on the watched body_type value.
  }

  return uniqueFields;
}

export function getSpecSchema(categorySlug: string, powertrainSlug: string) {
  const fields = getSpecFields(categorySlug, powertrainSlug);
  const shape: Record<string, any> = {};

  for (const field of fields) {
    let schema: any;

    switch (field.type) {
      case 'number':
        schema = z.number();
        break;
      case 'boolean':
        schema = z.boolean();
        break;
      case 'select':
        if (field.options) {
          schema = z.enum(field.options.map(o => o.value) as [string, ...string[]]);
        } else {
          schema = z.string();
        }
        break;
      case 'multiselect':
        schema = z.array(z.string());
        break;
      default:
        schema = z.string();
    }

    if (!field.required) {
      schema = schema.optional().nullable();
    }

    shape[field.key] = schema;
  }

  return z.object(shape).passthrough();
}
