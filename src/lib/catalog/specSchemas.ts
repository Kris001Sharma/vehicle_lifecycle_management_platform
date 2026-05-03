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

const SUBCATEGORY_FIELDS: Record<string, SpecField[]> = {
  'motorcycle': [
    { key: 'engine_type', label: 'Engine Type', type: 'select', options: [{value:'single',label:'Single'},{value:'parallel-twin',label:'Parallel Twin'},{value:'v-twin',label:'V-Twin'},{value:'inline-four',label:'Inline Four'}], required: false, group: 'Performance' },
    { key: 'top_speed_kmph', label: 'Top Speed', type: 'number', unit: 'km/h', required: false, group: 'Performance' },
  ],
  'scooter': [
    { key: 'underseat_storage_litres', label: 'Underseat Storage', type: 'number', unit: 'litres', required: false, group: 'Storage' },
    { key: 'boot_space_litres', label: 'Boot Space', type: 'number', unit: 'litres', required: false, group: 'Storage' },
  ],
  'moped': [
    { key: 'underseat_storage_litres', label: 'Underseat Storage', type: 'number', unit: 'litres', required: false, group: 'Storage' },
    { key: 'boot_space_litres', label: 'Boot Space', type: 'number', unit: 'litres', required: false, group: 'Storage' },
  ],
  'electric-bicycle': [
    { key: 'motor_wattage_w', label: 'Motor wattage', type: 'number', unit: 'W', required: false, group: 'Motor' },
    { key: 'pedal_assist_levels', label: 'Pedal Assist Levels', type: 'number', required: false, group: 'Motor' },
    { key: 'max_speed_kmph', label: 'Max speed (legal limit)', type: 'number', unit: 'km/h', required: false, group: 'Motor' },
  ],
  'passenger-autorickshaw': [
    { key: 'passenger_capacity', label: 'Passenger Capacity', type: 'number', required: false, group: 'Capacity' },
    { key: 'fare_meter_compatible', label: 'Fare meter compatible', type: 'boolean', required: false, group: 'Capacity' },
  ],
  'cargo-three-wheeler': [
    { key: 'payload_kg', label: 'Payload', type: 'number', unit: 'kg', required: false, group: 'Cargo' },
    { key: 'cargo_bed_length_mm', label: 'Cargo Bed Length', type: 'number', unit: 'mm', required: false, group: 'Cargo' },
  ],
  'hatchback': [
    { key: 'boot_space_litres', label: 'Boot Space', type: 'number', unit: 'litres', required: false, group: 'Comfort' },
    { key: 'airbag_count', label: 'Airbag Count', type: 'number', required: false, group: 'Comfort' },
    { key: 'ncap_rating', label: 'NCAP Rating', type: 'number', required: false, group: 'Comfort' },
  ],
  'sedan': [
    { key: 'boot_space_litres', label: 'Boot Space', type: 'number', unit: 'litres', required: false, group: 'Comfort' },
    { key: 'airbag_count', label: 'Airbag Count', type: 'number', required: false, group: 'Comfort' },
    { key: 'ncap_rating', label: 'NCAP Rating', type: 'number', required: false, group: 'Comfort' },
  ],
  'crossover': [
    { key: 'boot_space_litres', label: 'Boot Space', type: 'number', unit: 'litres', required: false, group: 'Comfort' },
    { key: 'airbag_count', label: 'Airbag Count', type: 'number', required: false, group: 'Comfort' },
    { key: 'ncap_rating', label: 'NCAP Rating', type: 'number', required: false, group: 'Comfort' },
  ],
  'convertible': [
    { key: 'boot_space_litres', label: 'Boot Space', type: 'number', unit: 'litres', required: false, group: 'Comfort' },
    { key: 'airbag_count', label: 'Airbag Count', type: 'number', required: false, group: 'Comfort' },
    { key: 'ncap_rating', label: 'NCAP Rating', type: 'number', required: false, group: 'Comfort' },
  ],
  'suv': [
    { key: 'boot_space_litres', label: 'Boot Space', type: 'number', unit: 'litres', required: false, group: 'Comfort' },
    { key: 'ground_clearance_mm', label: 'Ground Clearance', type: 'number', unit: 'mm', required: false, group: 'Comfort' },
    { key: 'airbag_count', label: 'Airbag Count', type: 'number', required: false, group: 'Comfort' },
    { key: 'ncap_rating', label: 'NCAP Rating', type: 'number', required: false, group: 'Comfort' },
    { key: 'third_row_seating', label: 'Third row seating', type: 'boolean', required: false, group: 'Comfort' },
    { key: 'four_wheel_drive', label: '4WD / AWD available', type: 'boolean', required: false, group: 'Comfort' },
  ],
  'muv-mpv': [
    { key: 'boot_space_litres', label: 'Boot Space', type: 'number', unit: 'litres', required: false, group: 'Comfort' },
    { key: 'ground_clearance_mm', label: 'Ground Clearance', type: 'number', unit: 'mm', required: false, group: 'Comfort' },
    { key: 'airbag_count', label: 'Airbag Count', type: 'number', required: false, group: 'Comfort' },
    { key: 'ncap_rating', label: 'NCAP Rating', type: 'number', required: false, group: 'Comfort' },
    { key: 'third_row_seating', label: 'Third row seating', type: 'boolean', required: false, group: 'Comfort' },
    { key: 'four_wheel_drive', label: '4WD / AWD available', type: 'boolean', required: false, group: 'Comfort' },
  ],
  'minivan': [
    { key: 'passenger_seating', label: 'Passenger Seating', type: 'number', required: false, group: 'Passenger' },
    { key: 'sliding_door', label: 'Sliding door', type: 'boolean', required: false, group: 'Passenger' },
    { key: 'ac_type', label: 'AC Type', type: 'select', options: [{value:'none',label:'None'},{value:'manual',label:'Manual'},{value:'automatic',label:'Automatic'}], required: false, group: 'Passenger' },
  ],
  'mini-truck': [
    { key: 'payload_kg', label: 'Payload', type: 'number', unit: 'kg', required: false, group: 'Cargo' },
    { key: 'cargo_bed_length_mm', label: 'Cargo Bed Length', type: 'number', unit: 'mm', required: false, group: 'Cargo' },
    { key: 'cargo_bed_width_mm', label: 'Cargo Bed Width', type: 'number', unit: 'mm', required: false, group: 'Cargo' },
    { key: 'cargo_bed_height_mm', label: 'Cargo Bed Height', type: 'number', unit: 'mm', required: false, group: 'Cargo' },
    { key: 'cabin_type', label: 'Cabin Type', type: 'select', options: [{value:'single',label:'Single'},{value:'double',label:'Double'}], required: false, group: 'Cargo' },
  ],
  'pickup-truck': [
    { key: 'payload_kg', label: 'Payload', type: 'number', unit: 'kg', required: false, group: 'Cargo' },
    { key: 'cargo_bed_length_mm', label: 'Cargo Bed Length', type: 'number', unit: 'mm', required: false, group: 'Cargo' },
    { key: 'cargo_bed_width_mm', label: 'Cargo Bed Width', type: 'number', unit: 'mm', required: false, group: 'Cargo' },
    { key: 'towing_capacity_kg', label: 'Towing Capacity', type: 'number', unit: 'kg', required: false, group: 'Cargo' },
    { key: 'cabin_type', label: 'Cabin Type', type: 'select', options: [{value:'single',label:'Single'},{value:'double',label:'Double'},{value:'crew',label:'Crew'}], required: false, group: 'Cargo' },
  ],
  'cargo-van': [
    { key: 'cargo_volume_m3', label: 'Cargo volume', type: 'number', unit: 'm³', required: false, group: 'Cargo' },
    { key: 'load_floor_length_mm', label: 'Load Floor Length', type: 'number', unit: 'mm', required: false, group: 'Cargo' },
    { key: 'roof_height', label: 'Roof Height', type: 'select', options: [{value:'standard',label:'Standard'},{value:'high-roof',label:'High Roof'}], required: false, group: 'Cargo' },
    { key: 'payload_kg', label: 'Payload', type: 'number', unit: 'kg', required: false, group: 'Cargo' },
  ],
  'small-container-truck': [
    { key: 'gvw_kg', label: 'GVW', type: 'number', unit: 'kg', required: false, group: 'Cargo' },
    { key: 'payload_kg', label: 'Payload', type: 'number', unit: 'kg', required: false, group: 'Cargo' },
    { key: 'container_length_ft', label: 'Max container length', type: 'select', options: [{value:'10',label:'10'},{value:'14',label:'14'},{value:'17',label:'17'},{value:'20',label:'20'}], required: false, group: 'Cargo' },
    { key: 'number_of_axles', label: 'Number of Axles', type: 'number', required: false, group: 'Cargo' },
  ],
  'school-van': [
    { key: 'passenger_seating', label: 'Student seating capacity', type: 'number', required: false, group: 'Passenger' },
    { key: 'gps_tracking', label: 'GPS tracking standard', type: 'boolean', required: false, group: 'Passenger' },
    { key: 'first_aid_kit', label: 'First aid kit standard', type: 'boolean', required: false, group: 'Passenger' },
  ],
  'ambulance-special': [
    { key: 'stretcher_capacity', label: 'Stretcher Capacity', type: 'number', required: false, group: 'Special' },
    { key: 'special_purpose_description', label: 'Special purpose description', type: 'text', required: false, group: 'Special' },
  ],
  'city-bus': [
    { key: 'passenger_seating', label: 'Passenger Seating', type: 'number', required: false, group: 'Passenger' },
    { key: 'standing_capacity', label: 'Standing Capacity', type: 'number', required: false, group: 'Passenger' },
    { key: 'door_count', label: 'Door Count', type: 'number', required: false, group: 'Passenger' },
    { key: 'low_floor', label: 'Low floor', type: 'boolean', required: false, group: 'Passenger' },
    { key: 'ac_type', label: 'AC Type', type: 'select', options: [{value:'none',label:'None'},{value:'manual',label:'Manual'},{value:'automatic',label:'Automatic'}], required: false, group: 'Passenger' },
    { key: 'wheelchair_accessible', label: 'Wheelchair Accessible', type: 'boolean', required: false, group: 'Passenger' },
  ],
  'intercity-bus': [
    { key: 'passenger_seating', label: 'Passenger Seating', type: 'number', required: false, group: 'Passenger' },
    { key: 'ac_type', label: 'AC Type', type: 'select', options: [{value:'none',label:'None'},{value:'manual',label:'Manual'},{value:'automatic',label:'Automatic'}], required: false, group: 'Passenger' },
    { key: 'luggage_compartment', label: 'Underfloor luggage compartment', type: 'boolean', required: false, group: 'Passenger' },
    { key: 'reclining_seats', label: 'Reclining Seats', type: 'boolean', required: false, group: 'Passenger' },
  ],
  'school-bus': [
    { key: 'passenger_seating', label: 'Student seating capacity', type: 'number', required: false, group: 'Passenger' },
    { key: 'emergency_exits', label: 'Emergency Exits', type: 'number', required: false, group: 'Passenger' },
    { key: 'gps_tracking', label: 'GPS tracking standard', type: 'boolean', required: false, group: 'Passenger' },
    { key: 'speed_limiter', label: 'Speed limiter fitted', type: 'boolean', required: false, group: 'Passenger' },
  ],
  'rigid-truck': [
    { key: 'gvw_kg', label: 'GVW', type: 'number', unit: 'kg', required: false, group: 'Load' },
    { key: 'payload_kg', label: 'Payload', type: 'number', unit: 'kg', required: false, group: 'Load' },
    { key: 'number_of_axles', label: 'Number of Axles', type: 'number', required: false, group: 'Load' },
    { key: 'body_type', label: 'Body Type', type: 'select', options: [{value:'flatbed',label:'Flatbed'},{value:'box',label:'Box'},{value:'curtainsider',label:'Curtainsider'},{value:'refrigerated',label:'Refrigerated'},{value:'tanker',label:'Tanker'},{value:'other',label:'Other'}], required: false, group: 'Load' },
  ],
  'tipper': [
    { key: 'gvw_kg', label: 'GVW', type: 'number', unit: 'kg', required: false, group: 'Load' },
    { key: 'payload_kg', label: 'Payload', type: 'number', unit: 'kg', required: false, group: 'Load' },
    { key: 'body_volume_m3', label: 'Body volume', type: 'number', unit: 'm³', required: false, group: 'Load' },
    { key: 'tipping_mechanism', label: 'Tipping Mechanism', type: 'select', options: [{value:'rear',label:'Rear'},{value:'side',label:'Side'},{value:'three-way',label:'Three-way'}], required: false, group: 'Load' },
    { key: 'number_of_axles', label: 'Number of Axles', type: 'number', required: false, group: 'Load' },
  ],
};

// Helper: duplicates a common field but mark it optional/required for specific cases if needed
// Actually, I'll just use them as they are defined.

export function getSpecFields(categorySlug: string, subcategorySlug: string | null, powertrainSlug: string): SpecField[] {
  const common = [...COMMON_FIELDS];
  const categoryFields = CATEGORY_FIELDS[categorySlug] || [];
  const subcategoryFields = subcategorySlug ? (SUBCATEGORY_FIELDS[subcategorySlug] || []) : [];
  const powertrainFields = POWERTRAIN_FIELDS[powertrainSlug] || [];

  // Merge them, giving precedence to subcategoryFields over categoryFields, etc.
  // We'll process in order: common -> powertrain -> category -> subcategory
  // and overwrite if key exists (since we iterate backwards when checking keys).
  // Actually, easiest is mapping them.
  const fieldsMap = new Map<string, SpecField>();
  
  [...common, ...powertrainFields, ...categoryFields, ...subcategoryFields].forEach(field => {
    fieldsMap.set(field.key, field);
  });
  
  // Electric bicycle special case
  if (subcategorySlug === 'electric-bicycle') {
    fieldsMap.delete('engine_displacement_cc');
  }

  // To preserve group ordering mostly as before, we could just return Array.from(fieldsMap.values())
  // But wait, the original logic kept the first occurrence when traversing [common, category, powertrain].
  // Since subcategory overrides category, let's just use Map and keep the last added overlay for a key.
  
  return Array.from(fieldsMap.values());
}

export function getSpecSchema(categorySlug: string, subcategorySlug: string | null, powertrainSlug: string) {
  const fields = getSpecFields(categorySlug, subcategorySlug, powertrainSlug);
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
