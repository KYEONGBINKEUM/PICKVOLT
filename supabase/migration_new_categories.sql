-- specs_headphones
CREATE TABLE IF NOT EXISTS specs_headphones (
  product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  form_factor text,
  driver_size_mm numeric,
  frequency_response text,
  impedance_ohm numeric,
  sensitivity_db numeric,
  noise_canceling boolean DEFAULT false,
  wireless boolean DEFAULT true,
  bluetooth_version text,
  codec text,
  battery_hours numeric,
  weight_g numeric,
  has_microphone boolean DEFAULT true,
  ip_rating text,
  connectivity text
);

-- specs_monitor
CREATE TABLE IF NOT EXISTS specs_monitor (
  product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  display_inch numeric,
  display_resolution text,
  panel_type text,
  display_hz numeric,
  response_time_ms numeric,
  brightness_nits numeric,
  hdr text,
  aspect_ratio text,
  adaptive_sync text,
  curved boolean DEFAULT false,
  vesa_mount boolean DEFAULT true,
  weight_kg numeric,
  display_color_gamut text
);

-- specs_tv
CREATE TABLE IF NOT EXISTS specs_tv (
  product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  display_inch numeric,
  display_resolution text,
  panel_type text,
  display_hz numeric,
  hdr text,
  brightness_nits numeric,
  smart_platform text,
  audio_watts numeric,
  hdmi_ports integer,
  usb_ports integer,
  weight_kg numeric,
  thickness_mm numeric,
  display_color_gamut text
);

-- specs_car
CREATE TABLE IF NOT EXISTS specs_car (
  product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  body_type text,
  drivetrain text,
  powertrain text,
  engine_cc integer,
  horsepower integer,
  torque_nm integer,
  acceleration_0_100 numeric,
  top_speed_kmh integer,
  range_km integer,
  battery_kwh numeric,
  fuel_efficiency_km_l numeric,
  seating integer,
  cargo_liters integer,
  length_mm integer,
  width_mm integer,
  height_mm integer,
  wheelbase_mm integer,
  curb_weight_kg integer,
  segment text
);

-- RLS: allow public read (service role bypasses anyway)
ALTER TABLE specs_headphones ENABLE ROW LEVEL SECURITY;
ALTER TABLE specs_monitor ENABLE ROW LEVEL SECURITY;
ALTER TABLE specs_tv ENABLE ROW LEVEL SECURITY;
ALTER TABLE specs_car ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read specs_headphones" ON specs_headphones FOR SELECT USING (true);
CREATE POLICY "public read specs_monitor" ON specs_monitor FOR SELECT USING (true);
CREATE POLICY "public read specs_tv" ON specs_tv FOR SELECT USING (true);
CREATE POLICY "public read specs_car" ON specs_car FOR SELECT USING (true);
