-- ════════════════════════════════════════════════════════════════
-- GearHub Pro — Schema V2: Full technical spec columns
-- Run this in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- ── CAMERAS ──────────────────────────────────────────────────────
ALTER TABLE cameras
  ADD COLUMN IF NOT EXISTS sensor_type TEXT,           -- "BSI CMOS", "Stacked BSI CMOS", "CCD"
  ADD COLUMN IF NOT EXISTS sensor_size TEXT,           -- "Full-Frame", "APS-C", "Super 35", "Medium Format", "Micro Four Thirds", "1-inch"
  ADD COLUMN IF NOT EXISTS megapixels NUMERIC(5,1),    -- 24.2, 45.7, 102
  ADD COLUMN IF NOT EXISTS iso_range TEXT,             -- "100-51200"
  ADD COLUMN IF NOT EXISTS max_video_resolution TEXT,  -- "8K", "6K", "4K DCI", "4K UHD", "1080p"
  ADD COLUMN IF NOT EXISTS max_video_fps TEXT,         -- "120fps @ 4K", "60fps @ 8K"
  ADD COLUMN IF NOT EXISTS dynamic_range_stops NUMERIC(4,1), -- 15.0, 17.0
  ADD COLUMN IF NOT EXISTS lens_mount TEXT,            -- "Sony E", "Canon RF", "Nikon Z", "PL", "L-Mount", "EF"
  ADD COLUMN IF NOT EXISTS ibis BOOLEAN,              -- in-body image stabilization
  ADD COLUMN IF NOT EXISTS ibis_stops NUMERIC(3,1),    -- 5.0, 7.0, 8.0
  ADD COLUMN IF NOT EXISTS af_points INTEGER,          -- 759, 1053, 693
  ADD COLUMN IF NOT EXISTS af_type TEXT,               -- "Hybrid PDAF + Contrast", "Phase Detection"
  ADD COLUMN IF NOT EXISTS continuous_fps NUMERIC(5,1), -- 30.0, 20.0, 12.0
  ADD COLUMN IF NOT EXISTS video_codec TEXT,           -- "ProRes, H.265, XAVC", "ARRIRAW, ProRes"
  ADD COLUMN IF NOT EXISTS bit_depth TEXT,             -- "10-bit", "12-bit", "16-bit RAW"
  ADD COLUMN IF NOT EXISTS color_sampling TEXT,        -- "4:2:2", "4:2:0"
  ADD COLUMN IF NOT EXISTS recording_media TEXT,       -- "CFexpress Type A", "SD UHS-II", "SSD"
  ADD COLUMN IF NOT EXISTS nd_filter TEXT,             -- "Built-in 2-8 stops", null
  ADD COLUMN IF NOT EXISTS body_material TEXT,         -- "Magnesium Alloy", "Aluminum", "Polycarbonate"
  ADD COLUMN IF NOT EXISTS weather_sealed BOOLEAN,
  ADD COLUMN IF NOT EXISTS weight_g INTEGER,           -- weight in grams
  ADD COLUMN IF NOT EXISTS dimensions TEXT,            -- "131 x 97 x 80 mm"
  ADD COLUMN IF NOT EXISTS battery_type TEXT,          -- "NP-FZ100", "LP-E6NH"
  ADD COLUMN IF NOT EXISTS battery_life INTEGER,       -- shots per charge or minutes
  ADD COLUMN IF NOT EXISTS monitor_size TEXT,          -- "3.2-inch"
  ADD COLUMN IF NOT EXISTS monitor_type TEXT,          -- "Vari-angle Touchscreen", "Tilting"
  ADD COLUMN IF NOT EXISTS evf_resolution TEXT,        -- "5.76M dots", "9.44M dots"
  ADD COLUMN IF NOT EXISTS hdmi_output TEXT,           -- "Full-size HDMI", "Micro HDMI"
  ADD COLUMN IF NOT EXISTS usb_type TEXT,              -- "USB-C 3.2", "USB-C 10Gbps"
  ADD COLUMN IF NOT EXISTS wifi BOOLEAN,
  ADD COLUMN IF NOT EXISTS bluetooth BOOLEAN;

-- ── LENSES ───────────────────────────────────────────────────────
ALTER TABLE lenses
  ADD COLUMN IF NOT EXISTS focal_length TEXT,           -- "24-70mm", "50mm", "15-40mm"
  ADD COLUMN IF NOT EXISTS max_aperture TEXT,           -- "f/2.8", "T1.8", "f/1.4"
  ADD COLUMN IF NOT EXISTS min_aperture TEXT,           -- "f/22", "T22"
  ADD COLUMN IF NOT EXISTS lens_mount TEXT,             -- "Sony E", "Canon RF", "PL", "EF"
  ADD COLUMN IF NOT EXISTS format_coverage TEXT,        -- "Full-Frame", "Super 35", "APS-C", "Large Format"
  ADD COLUMN IF NOT EXISTS image_circle_mm NUMERIC(5,1),-- 46.5, 43.2, null
  ADD COLUMN IF NOT EXISTS min_focus_distance TEXT,     -- "0.38m", "15 inches"
  ADD COLUMN IF NOT EXISTS max_magnification TEXT,      -- "0.28x", "1:1"
  ADD COLUMN IF NOT EXISTS filter_size_mm INTEGER,      -- 82, 77, 95
  ADD COLUMN IF NOT EXISTS optical_design TEXT,         -- "15 elements in 11 groups"
  ADD COLUMN IF NOT EXISTS special_elements TEXT,       -- "2 ED, 3 aspherical", "Super ED, XA"
  ADD COLUMN IF NOT EXISTS aperture_blades INTEGER,     -- 9, 11, 14
  ADD COLUMN IF NOT EXISTS image_stabilization BOOLEAN,
  ADD COLUMN IF NOT EXISTS autofocus BOOLEAN,
  ADD COLUMN IF NOT EXISTS af_motor TEXT,               -- "XD Linear", "Nano USM", "VXD", "STM"
  ADD COLUMN IF NOT EXISTS weather_sealed BOOLEAN,
  ADD COLUMN IF NOT EXISTS weight_g INTEGER,            -- weight in grams
  ADD COLUMN IF NOT EXISTS dimensions TEXT,             -- "88 x 126 mm"
  ADD COLUMN IF NOT EXISTS focus_rotation_deg INTEGER,  -- 270, 300, 330 (cine lenses)
  ADD COLUMN IF NOT EXISTS front_diameter_mm INTEGER,   -- 80, 95, 110, 114 (cine lenses)
  ADD COLUMN IF NOT EXISTS lens_data_system TEXT,       -- "LDS-2", "Cooke /i", "ZEISS XD"
  ADD COLUMN IF NOT EXISTS anamorphic_ratio TEXT,       -- "2x", "1.5x", "1.33x", null for spherical
  ADD COLUMN IF NOT EXISTS parfocal BOOLEAN;            -- true for cine zooms

-- ── LIGHTING ─────────────────────────────────────────────────────
ALTER TABLE lighting
  ADD COLUMN IF NOT EXISTS form_factor TEXT,            -- "Panel", "Fresnel", "COB/Monolight", "Tube", "Soft Light", "PAR", "Ellipsoidal", "Ring Light", "Bulb"
  ADD COLUMN IF NOT EXISTS color_temp_range TEXT,       -- "2700-10000K", "5600K"
  ADD COLUMN IF NOT EXISTS color_type TEXT,             -- "Bi-Color", "Daylight", "Tungsten", "RGBWW", "RGBLAC", "Full Color"
  ADD COLUMN IF NOT EXISTS cri NUMERIC(4,1),           -- 96, 98, 99
  ADD COLUMN IF NOT EXISTS tlci NUMERIC(4,1),          -- 93, 95, 99
  ADD COLUMN IF NOT EXISTS power_draw_w INTEGER,       -- 500, 115, 60
  ADD COLUMN IF NOT EXISTS output_lux TEXT,             -- "55800 lux @ 3.3'", "14350 lux @ 1m"
  ADD COLUMN IF NOT EXISTS beam_angle TEXT,             -- "14-50°", "120°", "65°"
  ADD COLUMN IF NOT EXISTS dimming_range TEXT,          -- "0-100%", "0.1-100%"
  ADD COLUMN IF NOT EXISTS color_modes TEXT,            -- "CCT, HSI, RGBWW, Gel, Effects"
  ADD COLUMN IF NOT EXISTS ip_rating TEXT,              -- "IP65", "IP54", "IP23"
  ADD COLUMN IF NOT EXISTS weight_g INTEGER,           -- weight in grams
  ADD COLUMN IF NOT EXISTS dimensions TEXT,            -- "330 x 175 mm"
  ADD COLUMN IF NOT EXISTS power_input TEXT,            -- "100-240V AC", "48V DC"
  ADD COLUMN IF NOT EXISTS control_options TEXT,        -- "DMX, CRMX, Bluetooth, Wi-Fi, Art-Net"
  ADD COLUMN IF NOT EXISTS battery_option BOOLEAN,     -- can run on battery
  ADD COLUMN IF NOT EXISTS battery_type TEXT,           -- "V-Mount", "Gold Mount", "Built-in"
  ADD COLUMN IF NOT EXISTS cooling TEXT,                -- "Fan", "Passive", "Hybrid"
  ADD COLUMN IF NOT EXISTS accessory_mount TEXT,        -- "Bowens", "Universal", "Proprietary"
  ADD COLUMN IF NOT EXISTS tungsten_equivalent TEXT,    -- "1000W tungsten", "4000W tungsten" (for comparing LED/HMI to old fixtures)
  ADD COLUMN IF NOT EXISTS lamp_type TEXT;              -- "LED COB", "HMI MSR", "LED SMD" (for HMI: bulb type)

-- ── INDEXES for filterable columns ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cameras_subcategory ON cameras(subcategory);
CREATE INDEX IF NOT EXISTS idx_cameras_sensor_size ON cameras(sensor_size);
CREATE INDEX IF NOT EXISTS idx_cameras_lens_mount ON cameras(lens_mount);

CREATE INDEX IF NOT EXISTS idx_lenses_subcategory ON lenses(subcategory);
CREATE INDEX IF NOT EXISTS idx_lenses_lens_mount ON lenses(lens_mount);
CREATE INDEX IF NOT EXISTS idx_lenses_format ON lenses(format_coverage);

CREATE INDEX IF NOT EXISTS idx_lighting_subcategory ON lighting(subcategory);
CREATE INDEX IF NOT EXISTS idx_lighting_form_factor ON lighting(form_factor);
CREATE INDEX IF NOT EXISTS idx_lighting_color_type ON lighting(color_type);
