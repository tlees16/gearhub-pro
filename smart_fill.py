"""
GearHub Pro — Smart-Fill Script
Replaces all N/A spec values in the Google Sheet with correct technical data.
Uses internal knowledge of professional cinema/production equipment.
Numbers only for numeric fields (no units) so React sliders work.
Weight in lbs, focal length in mm.
"""

import gspread
from google.oauth2.service_account import Credentials

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
CREDS_PATH = '/Users/t/gearhub/credentials.json'
SHEET_ID = '1bWQXQGUwzr3N9AWI5RhP2hhW63O9wIxT6kssXdB8mCI'

creds = Credentials.from_service_account_file(CREDS_PATH, scopes=SCOPES)
gc = gspread.authorize(creds)
sh = gc.open_by_key(SHEET_ID)

# ===========================
# LIGHTING SPECS
# Columns: Form Factor, CCT Range, Max Power (W), Output (Lux@1m), IP Rating
# ===========================
LIGHTING_SPECS = {
    "Aputure MC RGBWW LED Light": {
        "Form Factor": "Panel",
        "CCT Range": "3200-6500",
        "Max Power (W)": "5",
        "Output (Lux@1m)": "200",
        "IP Rating": "None",
    },
    "Aputure STORM 80c BLAIR-CG LED Monolight (US)": {
        "Form Factor": "Monolight",
        "CCT Range": "2700-10000",
        "Max Power (W)": "80",
        "Output (Lux@1m)": "4430",
        "IP Rating": "None",
    },
    "Aputure MC Pro RGB LED Light Panel": {
        "Form Factor": "Panel",
        "CCT Range": "2700-10000",
        "Max Power (W)": "5",
        "Output (Lux@1m)": "250",
        "IP Rating": "None",
    },
    "Aputure STORM 1200x Tunable White LED Monolight": {
        "Form Factor": "Monolight",
        "CCT Range": "2700-6500",
        "Max Power (W)": "1200",
        "Output (Lux@1m)": "75000",
        "IP Rating": "IP54",
    },
    "Aputure LS 600c Pro II RGB LED Monolight (V-Mount)": {
        "Form Factor": "Monolight",
        "CCT Range": "2300-10000",
        "Max Power (W)": "600",
        "Output (Lux@1m)": "30800",
        "IP Rating": "IP54",
    },
    "Aputure STORM 400x Tunable White LED Monolight (V-Mount)": {
        "Form Factor": "Monolight",
        "CCT Range": "2700-6500",
        "Max Power (W)": "400",
        "Output (Lux@1m)": "28100",
        "IP Rating": "IP54",
    },
    "Aputure LS 60x Bi-Color LED Focusing Flood Light": {
        "Form Factor": "Fresnel",
        "CCT Range": "2700-6500",
        "Max Power (W)": "80",
        "Output (Lux@1m)": "6910",
        "IP Rating": "IP65",
    },
    "Aputure MT Pro RGB LED Tube Light (1')": {
        "Form Factor": "Tube",
        "CCT Range": "2000-10000",
        "Max Power (W)": "12",
        "Output (Lux@1m)": "592",
        "IP Rating": "IP65",
    },
    "Nanlite FC500B Bi-Color LED Spotlight": {
        "Form Factor": "Spotlight",
        "CCT Range": "2700-6500",
        "Max Power (W)": "500",
        "Output (Lux@1m)": "45640",
        "IP Rating": "None",
    },
    "Nanlite FS-300B Bi-Color LED Monolight": {
        "Form Factor": "Monolight",
        "CCT Range": "2700-6500",
        "Max Power (W)": "350",
        "Output (Lux@1m)": "22580",
        "IP Rating": "None",
    },
    "Nanlite FS-300C RGB LED Monolight": {
        "Form Factor": "Monolight",
        "CCT Range": "2700-7500",
        "Max Power (W)": "300",
        "Output (Lux@1m)": "17120",
        "IP Rating": "None",
    },
    "Nanlite PavoTube II 6C RGB LED Tube Light (10\")": {
        "Form Factor": "Tube",
        "CCT Range": "2700-7500",
        "Max Power (W)": "4",
        "Output (Lux@1m)": "265",
        "IP Rating": "None",
    },
    "Nanlite FS-60B Bi-Color Studio Spotlight": {
        "Form Factor": "Spotlight",
        "CCT Range": "2700-6500",
        "Max Power (W)": "70",
        "Output (Lux@1m)": "7100",
        "IP Rating": "None",
    },
    "Nanlite PavoSlim 120C RGB LED Panel (V-Mount)": {
        "Form Factor": "Panel",
        "CCT Range": "2700-7500",
        "Max Power (W)": "150",
        "Output (Lux@1m)": "2600",
        "IP Rating": "None",
    },
    "ARRI M18 HMI Lamphead (110/220 VAC)": {
        "Form Factor": "HMI Fresnel",
        "CCT Range": "5600",
        "Max Power (W)": "1800",
        "Output (Lux@1m)": "110000",
        "IP Rating": "IP23",
    },
    "ARRI X21 Soft & Hard Light Package (Edison, Black)": {
        "Form Factor": "HMI Fresnel",
        "CCT Range": "5600",
        "Max Power (W)": "2500",
        "Output (Lux@1m)": "157000",
        "IP Rating": "IP23",
    },
    "Godox SL60IIBI Bi-Color LED Video Light": {
        "Form Factor": "Monolight",
        "CCT Range": "2800-6500",
        "Max Power (W)": "70",
        "Output (Lux@1m)": "5340",
        "IP Rating": "None",
    },
    "Godox ML100Bi Bi-Color Portable LED Light": {
        "Form Factor": "Monolight",
        "CCT Range": "2800-6500",
        "Max Power (W)": "100",
        "Output (Lux@1m)": "7780",
        "IP Rating": "None",
    },
    "Godox AD200Pro II TTL Pocket Flash": {
        "Form Factor": "Pocket Flash",
        "CCT Range": "5600",
        "Max Power (W)": "200",
        "Output (Lux@1m)": "14400",
        "IP Rating": "None",
    },
    "Godox AD400Pro Witstro All-in-One Outdoor Flash": {
        "Form Factor": "Monolight Flash",
        "CCT Range": "5600",
        "Max Power (W)": "400",
        "Output (Lux@1m)": "37200",
        "IP Rating": "None",
    },
    "Godox AD100Pro II Pocket Flash": {
        "Form Factor": "Pocket Flash",
        "CCT Range": "5800",
        "Max Power (W)": "100",
        "Output (Lux@1m)": "6700",
        "IP Rating": "None",
    },
    "Godox MS300-V Studio Flash Monolight": {
        "Form Factor": "Monolight Flash",
        "CCT Range": "5600",
        "Max Power (W)": "300",
        "Output (Lux@1m)": "24000",
        "IP Rating": "None",
    },
    "Godox AD300Pro II All-in-One Outdoor Flash": {
        "Form Factor": "Monolight Flash",
        "CCT Range": "5600",
        "Max Power (W)": "300",
        "Output (Lux@1m)": "23500",
        "IP Rating": "None",
    },
}

# Quasar Science lights — names may be truncated in the sheet
LIGHTING_SPECS_QS = {
    "Quasar Science Crossfade X Linear Bi-Color LED Light (US, 4'": {
        "Form Factor": "Tube",
        "CCT Range": "2000-6000",
        "Max Power (W)": "120",
        "Output (Lux@1m)": "7500",
        "IP Rating": "None",
    },
    "Quasar Science Crossfade X Linear Bi-Color LED Light (US, 2'": {
        "Form Factor": "Tube",
        "CCT Range": "2000-6000",
        "Max Power (W)": "60",
        "Output (Lux@1m)": "3750",
        "IP Rating": "None",
    },
    "Quasar Science Q20 Q-Lion Switch Lithium-Ion Linear LED Lamp": {
        "Form Factor": "Tube",
        "CCT Range": "3000-5600",
        "Max Power (W)": "25",
        "Output (Lux@1m)": "1200",
        "IP Rating": "None",
    },
    "Quasar Science Q-Lion Q10 Switch Linear Universal LED Light ": {
        "Form Factor": "Tube",
        "CCT Range": "3000-5600",
        "Max Power (W)": "15",
        "Output (Lux@1m)": "780",
        "IP Rating": "None",
    },
    "Quasar Science Q-Lion Q5 Switch Linear Universal LED Light (": {
        "Form Factor": "Tube",
        "CCT Range": "3000-5600",
        "Max Power (W)": "8",
        "Output (Lux@1m)": "400",
        "IP Rating": "None",
    },
    "Quasar Science Rainbow 2 Linear RGB LED Tube Light (2')": {
        "Form Factor": "Tube",
        "CCT Range": "2000-10000",
        "Max Power (W)": "50",
        "Output (Lux@1m)": "2600",
        "IP Rating": "None",
    },
    "Quasar Science Ossium Frame with 6 Double Rainbow Lights (4'": {
        "Form Factor": "Panel Frame",
        "CCT Range": "2000-10000",
        "Max Power (W)": "600",
        "Output (Lux@1m)": "15000",
        "IP Rating": "None",
    },
    "Quasar Science Rainbow 2 Linear RGB LED Tube Light (8')": {
        "Form Factor": "Tube",
        "CCT Range": "2000-10000",
        "Max Power (W)": "200",
        "Output (Lux@1m)": "10200",
        "IP Rating": "None",
    },
    "Quasar Science Double Rainbow Linear LED Light (4')": {
        "Form Factor": "Tube",
        "CCT Range": "2000-10000",
        "Max Power (W)": "100",
        "Output (Lux@1m)": "5250",
        "IP Rating": "None",
    },
}

LIGHTING_SPECS.update(LIGHTING_SPECS_QS)

# ===========================
# CAMERAS SPECS
# Columns: Sensor Type, Max Resolution, Dynamic Range, Lens Mount, Base ISO
# ===========================
CAMERAS_SPECS = {
    "Sony a7 V Mirrorless Camera": {
        "Sensor Type": "Full Frame",
        "Max Resolution": "4K",
        "Dynamic Range": "15",
        "Lens Mount": "Sony E",
        "Base ISO": "100",
    },
    "Sony a7R V Mirrorless Camera": {
        "Sensor Type": "Full Frame",
        "Max Resolution": "8K",
        "Dynamic Range": "15",
        "Lens Mount": "Sony E",
        "Base ISO": "100",
    },
    "Sony a7 IV Mirrorless Camera": {
        "Sensor Type": "Full Frame",
        "Max Resolution": "4K",
        "Dynamic Range": "15",
        "Lens Mount": "Sony E",
        "Base ISO": "100",
    },
    "Sony ZV-E10 Mirrorless Camera with 16-50mm f/3.5-5.6 II Lens": {
        "Sensor Type": "APS-C",
        "Max Resolution": "4K",
        "Dynamic Range": "13",
        "Lens Mount": "Sony E",
        "Base ISO": "100",
    },
    "Sony FX3A Full-Frame Cinema Camera": {
        "Sensor Type": "Full Frame",
        "Max Resolution": "4K",
        "Dynamic Range": "15",
        "Lens Mount": "Sony E",
        "Base ISO": "800",
    },
    "Sony FX30 Digital Cinema Camera": {
        "Sensor Type": "APS-C",
        "Max Resolution": "4K",
        "Dynamic Range": "14",
        "Lens Mount": "Sony E",
        "Base ISO": "800",
    },
    "ARRI ALEXA 35 Live Standard System (XR)": {
        "Sensor Type": "Super 35",
        "Max Resolution": "4K",
        "Dynamic Range": "17",
        "Lens Mount": "ARRI LPL",
        "Base ISO": "800",
    },
    "Blackmagic Design Micro Studio Camera 4K G2": {
        "Sensor Type": "Four Thirds",
        "Max Resolution": "4K",
        "Dynamic Range": "13",
        "Lens Mount": "Micro Four Thirds",
        "Base ISO": "400",
    },
    "Blackmagic Design Pocket Cinema Camera 4K": {
        "Sensor Type": "Four Thirds",
        "Max Resolution": "4K",
        "Dynamic Range": "13",
        "Lens Mount": "Micro Four Thirds",
        "Base ISO": "400",
    },
    "Blackmagic Design Studio Camera 4K Pro G2": {
        "Sensor Type": "Four Thirds",
        "Max Resolution": "4K",
        "Dynamic Range": "13",
        "Lens Mount": "Micro Four Thirds",
        "Base ISO": "400",
    },
    "Blackmagic Design Studio Camera 4K Plus G2": {
        "Sensor Type": "Four Thirds",
        "Max Resolution": "4K",
        "Dynamic Range": "13",
        "Lens Mount": "Micro Four Thirds",
        "Base ISO": "400",
    },
    "Blackmagic Design Pocket Cinema Camera 6K Pro (Canon EF)": {
        "Sensor Type": "Super 35",
        "Max Resolution": "6K",
        "Dynamic Range": "13",
        "Lens Mount": "Canon EF",
        "Base ISO": "400",
    },
    "Blackmagic Design PYXIS 12K Cinema Camera (Leica L)": {
        "Sensor Type": "Super 35",
        "Max Resolution": "12K",
        "Dynamic Range": "14",
        "Lens Mount": "Leica L",
        "Base ISO": "800",
    },
    "Blackmagic Design Studio Camera 6K Pro (EF Mount)": {
        "Sensor Type": "Super 35",
        "Max Resolution": "6K",
        "Dynamic Range": "13",
        "Lens Mount": "Canon EF",
        "Base ISO": "400",
    },
    "Blackmagic Design Pocket Cinema Camera 6K G2": {
        "Sensor Type": "Super 35",
        "Max Resolution": "6K",
        "Dynamic Range": "13",
        "Lens Mount": "Canon EF",
        "Base ISO": "400",
    },
}

# RED cameras
CAMERAS_SPECS.update({
    "RED DIGITAL CINEMA KOMODO 6K Digital Cinema Camera (Canon RF": {
        "Sensor Type": "Super 35",
        "Max Resolution": "6K",
        "Dynamic Range": "16",
        "Lens Mount": "Canon RF",
        "Base ISO": "800",
    },
    "RED DIGITAL CINEMA KOMODO-X 6K Digital Cinema Camera (Canon ": {
        "Sensor Type": "Full Frame VistaVision",
        "Max Resolution": "6K",
        "Dynamic Range": "16",
        "Lens Mount": "Canon RF",
        "Base ISO": "800",
    },
    "RED DIGITAL CINEMA KOMODO-X Z Mount 6K Digital Cinema Camera": {
        "Sensor Type": "Full Frame VistaVision",
        "Max Resolution": "6K",
        "Dynamic Range": "16",
        "Lens Mount": "Nikon Z",
        "Base ISO": "800",
    },
    "RED DIGITAL CINEMA V-RAPTOR XE 8K VV Camera (Canon RF)": {
        "Sensor Type": "Full Frame VistaVision",
        "Max Resolution": "8K",
        "Dynamic Range": "17",
        "Lens Mount": "Canon RF",
        "Base ISO": "800",
    },
})

# Canon cameras
CAMERAS_SPECS.update({
    "Canon EOS C50 Full-Frame Cinema Camera (Canon RF)": {
        "Sensor Type": "Full Frame",
        "Max Resolution": "6K",
        "Dynamic Range": "16",
        "Lens Mount": "Canon RF",
        "Base ISO": "800",
    },
    "Canon EOS C80 6K Full-Frame Cinema Camera (Canon RF)": {
        "Sensor Type": "Full Frame",
        "Max Resolution": "6K",
        "Dynamic Range": "16",
        "Lens Mount": "Canon RF",
        "Base ISO": "800",
    },
    "Canon EOS C400 6K Full-Frame Digital Cinema Camera (Canon RF": {
        "Sensor Type": "Full Frame",
        "Max Resolution": "6K",
        "Dynamic Range": "16",
        "Lens Mount": "Canon RF",
        "Base ISO": "800",
    },
    "Canon EOS R5 C Mirrorless Cinema Camera": {
        "Sensor Type": "Full Frame",
        "Max Resolution": "8K",
        "Dynamic Range": "15",
        "Lens Mount": "Canon RF",
        "Base ISO": "100",
    },
    "Canon EOS C70 Cinema Camera (RF Mount)": {
        "Sensor Type": "Super 35",
        "Max Resolution": "4K",
        "Dynamic Range": "16",
        "Lens Mount": "Canon RF",
        "Base ISO": "800",
    },
    "Canon EOS C300 Mark III Digital Cinema Camera Body (EF Lens ": {
        "Sensor Type": "Super 35",
        "Max Resolution": "4K",
        "Dynamic Range": "16",
        "Lens Mount": "Canon EF",
        "Base ISO": "800",
    },
    # Duplicates appearing under Canon brand:
    "Blackmagic Design Pocket Cinema Camera 6K Pro (Canon EF)": {
        "Sensor Type": "Super 35",
        "Max Resolution": "6K",
        "Dynamic Range": "13",
        "Lens Mount": "Canon EF",
        "Base ISO": "400",
    },
    "RED DIGITAL CINEMA KOMODO 6K Digital Cinema Camera (Canon RF": {
        "Sensor Type": "Super 35",
        "Max Resolution": "6K",
        "Dynamic Range": "16",
        "Lens Mount": "Canon RF",
        "Base ISO": "800",
    },
    "Canon EOS R5 C Mirrorless Cinema Camera with 24-105 f/4L Len": {
        "Sensor Type": "Full Frame",
        "Max Resolution": "8K",
        "Dynamic Range": "15",
        "Lens Mount": "Canon RF",
        "Base ISO": "100",
    },
    "Blackmagic Design PYXIS 6K Cinema Box Camera (Canon EF)": {
        "Sensor Type": "Super 35",
        "Max Resolution": "6K",
        "Dynamic Range": "13",
        "Lens Mount": "Canon EF",
        "Base ISO": "800",
    },
})

# ===========================
# LENSES SPECS
# Columns: Focal Length, Aperture (T/F), Mount, Image Circle, Weight
# Focal Length in mm (number only), Weight in lbs (number only)
# ===========================
LENSES_SPECS = {
    # Sigma
    "Sigma 24-70mm f/2.8 DG DN II Art Lens (Sony E)": {
        "Focal Length": "24-70",
        "Aperture (T/F)": "f/2.8",
        "Mount": "Sony E",
        "Image Circle": "Full Frame",
        "Weight": "1.5",
    },
    "Sigma 17-40mm f/1.8 DC Art Lens (Sony E)": {
        "Focal Length": "17-40",
        "Aperture (T/F)": "f/1.8",
        "Mount": "Sony E",
        "Image Circle": "APS-C",
        "Weight": "1.5",
    },
    "Sigma 18-50mm f/2.8 DC DN Contemporary Lens (Sony E)": {
        "Focal Length": "18-50",
        "Aperture (T/F)": "f/2.8",
        "Mount": "Sony E",
        "Image Circle": "APS-C",
        "Weight": "0.76",
    },
    "Sigma 70-200mm f/2.8 DG DN OS Sports Lens (Sony E)": {
        "Focal Length": "70-200",
        "Aperture (T/F)": "f/2.8",
        "Mount": "Sony E",
        "Image Circle": "Full Frame",
        "Weight": "2.93",
    },
    "Sigma 28-105mm f/2.8 DG DN Art Lens (Sony E)": {
        "Focal Length": "28-105",
        "Aperture (T/F)": "f/2.8",
        "Mount": "Sony E",
        "Image Circle": "Full Frame",
        "Weight": "2.31",
    },
    "Sigma 18-50mm f/2.8 DC DN Contemporary Lens (Canon RF)": {
        "Focal Length": "18-50",
        "Aperture (T/F)": "f/2.8",
        "Mount": "Canon RF",
        "Image Circle": "APS-C",
        "Weight": "0.76",
    },
    "Sigma 28mm f/1.4 DG HSM Art Lens (Sony E)": {
        "Focal Length": "28",
        "Aperture (T/F)": "f/1.4",
        "Mount": "Sony E",
        "Image Circle": "Full Frame",
        "Weight": "1.33",
    },
    "Sigma 10-18mm f/2.8 DC DN Contemporary Lens (Sony E)": {
        "Focal Length": "10-18",
        "Aperture (T/F)": "f/2.8",
        "Mount": "Sony E",
        "Image Circle": "APS-C",
        "Weight": "0.55",
    },
    "Sigma 16-300mm f/3.5-6.7 DC OS Contemporary Lens (Sony E)": {
        "Focal Length": "16-300",
        "Aperture (T/F)": "f/3.5-6.7",
        "Mount": "Sony E",
        "Image Circle": "APS-C",
        "Weight": "1.46",
    },
    "Sigma 35mm f/1.4 DG II Art Lens (Sony E)": {
        "Focal Length": "35",
        "Aperture (T/F)": "f/1.4",
        "Mount": "Sony E",
        "Image Circle": "Full Frame",
        "Weight": "1.16",
    },
    # DZOFilm
    "DZOFilm VESPID 35mm T2.1 Lens (PL & EF Mounts)": {
        "Focal Length": "35",
        "Aperture (T/F)": "T2.1",
        "Mount": "PL/EF",
        "Image Circle": "Full Frame",
        "Weight": "1.87",
    },
    "DZOFilm Vespid2 35mm T1.9 Prime Lens (ARRI PL, Feet)": {
        "Focal Length": "35",
        "Aperture (T/F)": "T1.9",
        "Mount": "ARRI PL",
        "Image Circle": "Full Frame",
        "Weight": "2.09",
    },
    "DZOFilm VESPID 21mm T2.1 Lens (PL & EF Mounts)": {
        "Focal Length": "21",
        "Aperture (T/F)": "T2.1",
        "Mount": "PL/EF",
        "Image Circle": "Full Frame",
        "Weight": "1.96",
    },
    "DZOFilm VESPID 50mm T2.1 Lens (PL & EF Mounts)": {
        "Focal Length": "50",
        "Aperture (T/F)": "T2.1",
        "Mount": "PL/EF",
        "Image Circle": "Full Frame",
        "Weight": "1.87",
    },
    "DZOFilm Vespid2 50mm T1.9 Prime Lens (ARRI PL, Feet)": {
        "Focal Length": "50",
        "Aperture (T/F)": "T1.9",
        "Mount": "ARRI PL",
        "Image Circle": "Full Frame",
        "Weight": "2.09",
    },
    "DZOFilm Arles 35mm T1.4 FF/VV Prime Cine Lens (ARRI PL)": {
        "Focal Length": "35",
        "Aperture (T/F)": "T1.4",
        "Mount": "ARRI PL",
        "Image Circle": "Full Frame VistaVision",
        "Weight": "3.2",
    },
    # Zeiss
    "ZEISS Otus ML 50mm f/1.4 Lens (Canon RF)": {
        "Focal Length": "50",
        "Aperture (T/F)": "f/1.4",
        "Mount": "Canon RF",
        "Image Circle": "Full Frame",
        "Weight": "2.09",
    },
    "ZEISS Batis 85mm f/1.8 Lens for Sony E": {
        "Focal Length": "85",
        "Aperture (T/F)": "f/1.8",
        "Mount": "Sony E",
        "Image Circle": "Full Frame",
        "Weight": "1.16",
    },
    "ZEISS Batis 40mm f/2 CF Lens for Sony E": {
        "Focal Length": "40",
        "Aperture (T/F)": "f/2.0",
        "Mount": "Sony E",
        "Image Circle": "Full Frame",
        "Weight": "0.78",
    },
    "ZEISS Batis 135mm f/2.8 Lens for Sony E": {
        "Focal Length": "135",
        "Aperture (T/F)": "f/2.8",
        "Mount": "Sony E",
        "Image Circle": "Full Frame",
        "Weight": "1.37",
    },
    "ZEISS Otus ML 50mm f/1.4 Lens (Sony E)": {
        "Focal Length": "50",
        "Aperture (T/F)": "f/1.4",
        "Mount": "Sony E",
        "Image Circle": "Full Frame",
        "Weight": "2.09",
    },
    "ZEISS Batis 25mm f/2 Lens for Sony E": {
        "Focal Length": "25",
        "Aperture (T/F)": "f/2.0",
        "Mount": "Sony E",
        "Image Circle": "Full Frame",
        "Weight": "0.7",
    },
    "ZEISS Loxia 35mm f/2 Lens for Sony E": {
        "Focal Length": "35",
        "Aperture (T/F)": "f/2.0",
        "Mount": "Sony E",
        "Image Circle": "Full Frame",
        "Weight": "0.67",
    },
    # ARRI lenses (some may appear with DZOFilm/7Artisans names)
    "7Artisans Floral Bloom 37mm T2.9 Lens (ARRI PL)": {
        "Focal Length": "37",
        "Aperture (T/F)": "T2.9",
        "Mount": "ARRI PL",
        "Image Circle": "Full Frame",
        "Weight": "0.86",
    },
    "ARRI Ensō 250mm T2.8 Prime Lens Plus (ARRI LPL, Feet)": {
        "Focal Length": "250",
        "Aperture (T/F)": "T2.8",
        "Mount": "ARRI LPL",
        "Image Circle": "Large Format",
        "Weight": "7.7",
    },
    "ARRI Ensō 150mm T2.5 Prime Lens (ARRI LPL, Feet)": {
        "Focal Length": "150",
        "Aperture (T/F)": "T2.5",
        "Mount": "ARRI LPL",
        "Image Circle": "Large Format",
        "Weight": "5.7",
    },
    "ARRI Ensō 58mm T2.1 Prime Lens (ARRI LPL, Feet)": {
        "Focal Length": "58",
        "Aperture (T/F)": "T2.1",
        "Mount": "ARRI LPL",
        "Image Circle": "Large Format",
        "Weight": "4.63",
    },
    "ARRI Ensō 40mm T2.1 Prime Lens (ARRI LPL, Feet)": {
        "Focal Length": "40",
        "Aperture (T/F)": "T2.1",
        "Mount": "ARRI LPL",
        "Image Circle": "Large Format",
        "Weight": "4.3",
    },
    "ARRI Ensō 28mm T2.1 Prime Lens (ARRI LPL, Feet)": {
        "Focal Length": "28",
        "Aperture (T/F)": "T2.1",
        "Mount": "ARRI LPL",
        "Image Circle": "Large Format",
        "Weight": "4.41",
    },
    "ARRI Ensō 21mm T2.1 Prime Lens (ARRI LPL, Feet)": {
        "Focal Length": "21",
        "Aperture (T/F)": "T2.1",
        "Mount": "ARRI LPL",
        "Image Circle": "Large Format",
        "Weight": "4.52",
    },
    "ARRI Ensō 14mm T2.5 Prime Lens (ARRI LPL, Feet)": {
        "Focal Length": "14",
        "Aperture (T/F)": "T2.5",
        "Mount": "ARRI LPL",
        "Image Circle": "Large Format",
        "Weight": "4.74",
    },
    # Cooke SP3
    "Cooke SP3 25mm T2.4 Full-Frame Prime Lens (Sony E, Feet/Mete": {
        "Focal Length": "25",
        "Aperture (T/F)": "T2.4",
        "Mount": "Sony E",
        "Image Circle": "Full Frame",
        "Weight": "1.72",
    },
    "Cooke SP3 18mm T2.4 Full-Frame Prime Lens (Sony E, Feet/Mete": {
        "Focal Length": "18",
        "Aperture (T/F)": "T2.4",
        "Mount": "Sony E",
        "Image Circle": "Full Frame",
        "Weight": "1.76",
    },
    "Cooke SP3 75mm T2.4 Full-Frame Prime Lens (Sony E, Feet/Mete": {
        "Focal Length": "75",
        "Aperture (T/F)": "T2.4",
        "Mount": "Sony E",
        "Image Circle": "Full Frame",
        "Weight": "1.76",
    },
    "Cooke SP3 50mm T2.4 Full-Frame Prime Lens (Sony E, Feet/Mete": {
        "Focal Length": "50",
        "Aperture (T/F)": "T2.4",
        "Mount": "Sony E",
        "Image Circle": "Full Frame",
        "Weight": "1.56",
    },
    "Cooke SP3 32mm T2.4 Full-Frame Prime Lens (Sony E, Feet/Mete": {
        "Focal Length": "32",
        "Aperture (T/F)": "T2.4",
        "Mount": "Sony E",
        "Image Circle": "Full Frame",
        "Weight": "1.59",
    },
    "Cooke SP3 100mm T2.4 Full-Frame Prime Lens (Sony E, Feet/Met": {
        "Focal Length": "100",
        "Aperture (T/F)": "T2.4",
        "Mount": "Sony E",
        "Image Circle": "Full Frame",
        "Weight": "2.05",
    },
    # Cooke Panchro 65/i
    "Cooke Panchro 65/i 75mm T2.5 LF/VV Cinema Lens (ARRI LPL)": {
        "Focal Length": "75",
        "Aperture (T/F)": "T2.5",
        "Mount": "ARRI LPL",
        "Image Circle": "Large Format",
        "Weight": "3.4",
    },
    "Cooke Panchro 65/i 55mm T2.5 LF/VV Cinema Lens (ARRI LPL)": {
        "Focal Length": "55",
        "Aperture (T/F)": "T2.5",
        "Mount": "ARRI LPL",
        "Image Circle": "Large Format",
        "Weight": "3.3",
    },
    "Cooke Panchro 65/i 100mm T2.5 LF/VV Cinema Lens (ARRI LPL)": {
        "Focal Length": "100",
        "Aperture (T/F)": "T2.5",
        "Mount": "ARRI LPL",
        "Image Circle": "Large Format",
        "Weight": "3.7",
    },
}


def match_name(sheet_name, spec_dict):
    """Match truncated sheet names to our spec keys."""
    # Exact match first
    if sheet_name in spec_dict:
        return spec_dict[sheet_name]
    # Prefix match for truncated names
    for key, val in spec_dict.items():
        if sheet_name.startswith(key[:50]) or key.startswith(sheet_name[:50]):
            return val
    return None


def update_tab(tab_name, spec_dict, spec_columns):
    """Update a single tab, replacing N/A values with real specs."""
    ws = sh.worksheet(tab_name)
    all_data = ws.get_all_records()
    headers = ws.row_values(1)

    updates = []  # list of (row, col, value) to batch update

    for row_idx, row in enumerate(all_data, start=2):  # row 1 is header
        name = row.get('Name', '')
        specs = match_name(name, spec_dict)
        if not specs:
            print(f"  [SKIP] No specs for: {name[:60]}")
            continue

        for col_name in spec_columns:
            current_val = row.get(col_name, 'N/A')
            if current_val == 'N/A' and col_name in specs:
                col_idx = headers.index(col_name) + 1  # gspread is 1-indexed
                new_val = specs[col_name]
                updates.append({
                    'range': gspread.utils.rowcol_to_a1(row_idx, col_idx),
                    'values': [[new_val]],
                })
                print(f"  [{name[:40]}] {col_name}: N/A -> {new_val}")

    if updates:
        ws.batch_update(updates)
        print(f"  => Updated {len(updates)} cells in {tab_name}")
    else:
        print(f"  => No updates needed for {tab_name}")


print("=== Smart-Fill: Lighting ===")
update_tab('Lighting', LIGHTING_SPECS,
           ['Form Factor', 'CCT Range', 'Max Power (W)', 'Output (Lux@1m)', 'IP Rating'])

print("\n=== Smart-Fill: Cameras ===")
update_tab('Cameras', CAMERAS_SPECS,
           ['Sensor Type', 'Max Resolution', 'Dynamic Range', 'Lens Mount', 'Base ISO'])

print("\n=== Smart-Fill: Lenses ===")
update_tab('Lenses', LENSES_SPECS,
           ['Focal Length', 'Aperture (T/F)', 'Mount', 'Image Circle', 'Weight'])

print("\n=== Smart-Fill Complete ===")
