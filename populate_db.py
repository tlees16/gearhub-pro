"""
GearHub Pro — Phase 1: Populate Supabase with master product catalog.
Combines WebSearch-discovered B&H URLs with comprehensive product knowledge.
"""

import re, os, time
from supabase import create_client

SUPABASE_URL = "https://lzkdewuwrshiqjjndszx.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6a2Rld3V3cnNoaXFqam5kc3p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTYxNDk1MywiZXhwIjoyMDkxMTkwOTUzfQ.ZKwzCTeJ66gyYZVifjy-wuxk8unk3BnSeQ4YcHcXRD0")

BH = "https://www.bhphotovideo.com"

def sku_from_url(url):
    """Extract B&H SKU from URL like /c/product/1566877-REG/..."""
    m = re.search(r'/product/(\d+)-REG/', url)
    return m.group(1) if m else None

# ═══════════════════════════════════════════════════════════════════
# LIGHTING PRODUCTS
# ═══════════════════════════════════════════════════════════════════
LIGHTING = [
    # ARRI
    ("ARRI Orbiter LED Light (Blue/Silver)", "ARRI", "LED", None, f"{BH}/c/product/1566877-REG/arri_l1_0033520_orbiter_without_yoke_and.html"),
    ("ARRI Orbiter LED Light (Black)", "ARRI", "LED", None, f"{BH}/c/product/1566878-REG/arri_l1_0033521_orbiter_black_without_yoke.html"),
    ("ARRI Orbiter LED Light with Open Face 30°", "ARRI", "LED", None, f"{BH}/c/product/1544216-REG/arri_l0_0036566_orbiter_open_face_30_network.html"),
    ("ARRI Orbiter LED Light with Large Dome Optics", "ARRI", "LED", None, f"{BH}/c/product/1507144-REG/arri_l0_0034078_orbiter_dome_l_blue_silver.html"),
    ("ARRI L5-C LED 5\" Fresnel (Pole-Operated)", "ARRI", "LED", None, f"{BH}/c/product/1488445-REG/arri_l1_0001766_l5_c_5_led_fresnel.html"),
    ("ARRI L5-C LED 5\" Fresnel (Stand Mount)", "ARRI", "LED", None, f"{BH}/c/product/1486643-REG/arri_l1_0001764_l5_c_5_led_fresnel.html"),
    ("ARRI L5-C Plus RGB LED Fresnel", "ARRI", "LED", None, f"{BH}/c/product/1822479-REG/arri_l1_0048800_l5_c_plus_led_spotlights.html"),
    ("ARRI L7-C 7\" LED Fresnel (Pole-Operated)", "ARRI", "LED", None, f"{BH}/c/product/1036182-REG/arri_553509c_l7_c_7_led_fresnel.html"),
    ("ARRI SkyPanel S60-C LED Softlight", "ARRI", "LED", None, f"{BH}/c/product/1139001-REG/arri_l0_0007063_skypanel_s60_c_led_softlight.html"),
    ("ARRI SkyPanel S120-C LED Softlight", "ARRI", "LED", None, None),
    ("ARRI SkyPanel S360-C LED Softlight", "ARRI", "LED", None, None),
    ("ARRI SkyPanel X21 LED Light", "ARRI", "LED", None, None),
    ("ARRI SkyPanel X23 LED Light", "ARRI", "LED", None, None),

    # Aputure
    ("Aputure MC RGBWW LED Light", "Aputure", "LED", None, f"{BH}/c/product/1512600-REG/aputure_mc_rgbww_led_light.html"),
    ("Aputure MC Pro RGB LED Light Panel", "Aputure", "LED", None, None),
    ("Aputure Accent B7c LED RGBWW Light", "Aputure", "LED", None, f"{BH}/c/product/1595337-REG/aputure_aacbc7_accent_b7c_led_light.html"),
    ("Aputure Nova P300c RGB LED Light Panel", "Aputure", "LED", None, f"{BH}/c/product/1562060-REG/aputure_nova_p300c_rgbww_led.html"),
    ("Aputure LS 60d Daylight LED Light", "Aputure", "LED", None, f"{BH}/c/product/1560653-REG/aputure_light_storm_ls_60d.html"),
    ("Aputure LS 60x Bi-Color LED Light", "Aputure", "LED", None, None),
    ("Aputure LS 300x II Bi-Color LED Light", "Aputure", "LED", None, None),
    ("Aputure LS 600d Pro LED Light", "Aputure", "LED", None, None),
    ("Aputure LS 600c Pro II RGB LED Light", "Aputure", "LED", None, None),
    ("Aputure STORM 80c LED Monolight", "Aputure", "LED", None, None),
    ("Aputure STORM 400x LED Monolight", "Aputure", "LED", None, None),
    ("Aputure STORM 1200x LED Monolight", "Aputure", "LED", None, None),
    ("Aputure MT Pro RGB LED Tube Light", "Aputure", "LED", None, None),
    ("Aputure Amaran F22c RGBWW LED Mat", "Aputure", "LED", None, None),
    ("Aputure Amaran F22x Bi-Color LED Mat", "Aputure", "LED", None, None),

    # amaran
    ("amaran COB 60d S Daylight LED Monolight", "amaran", "LED", None, f"{BH}/c/product/1753987-REG/amaran_apa0020a10_amaran_cob_60d_s.html"),
    ("amaran COB 60x S Bi-Color LED Monolight", "amaran", "LED", None, f"{BH}/c/product/1753576-REG/amaran_apa0020a20_cob_60x_s_bi_color.html"),
    ("amaran COB 100d S Daylight LED Monolight", "amaran", "LED", None, f"{BH}/c/product/1753988-REG/amaran_apm021da10_amaran_cob_100d_s.html"),
    ("amaran COB 100x S Bi-Color LED Monolight", "amaran", "LED", None, f"{BH}/c/product/1753603-REG/amaran_apm021xa10_cob_100x_s_bi_color.html"),
    ("amaran COB 200d S Daylight LED Monolight", "amaran", "LED", None, None),
    ("amaran COB 200x S Bi-Color LED Monolight", "amaran", "LED", None, f"{BH}/c/product/1753990-REG/amaran_apm022xa10_amaran_cob_200x_s.html"),
    ("amaran Ray 120c RGB LED Monolight", "amaran", "LED", None, f"{BH}/c/product/1930189-REG/amaran_mp0000018g_ray_120c_rgb_led.html"),
    ("amaran P60c RGBWW LED Panel", "amaran", "LED", None, None),
    ("amaran P60x Bi-Color LED Panel", "amaran", "LED", None, None),
    ("amaran F21c RGBWW LED Mat", "amaran", "LED", None, None),
    ("amaran F21x Bi-Color LED Mat", "amaran", "LED", None, None),
    ("amaran T2c RGBWW LED Tube", "amaran", "LED", None, None),
    ("amaran T4c RGBWW LED Tube", "amaran", "LED", None, None),

    # Nanlite
    ("Nanlite Forza 60C RGBLAC LED Spotlight", "Nanlite", "LED", None, None),
    ("Nanlite Forza 150 LED Monolight", "Nanlite", "LED", None, None),
    ("Nanlite Forza 150B Bi-Color LED Monolight", "Nanlite", "LED", None, None),
    ("Nanlite Forza 300 LED Monolight", "Nanlite", "LED", None, None),
    ("Nanlite Forza 300B Bi-Color LED Monolight", "Nanlite", "LED", None, None),
    ("Nanlite Forza 500 LED Monolight", "Nanlite", "LED", None, None),
    ("Nanlite Forza 500B II Bi-Color LED Monolight", "Nanlite", "LED", None, None),
    ("Nanlite Forza 720 LED Monolight", "Nanlite", "LED", None, None),
    ("Nanlite Forza 720B Bi-Color LED Monolight", "Nanlite", "LED", None, None),
    ("Nanlite FC720C RGBLAC LED Spotlight", "Nanlite", "LED", None, None),
    ("Nanlite PavoTube II 6C RGB LED Tube (10\")", "Nanlite", "LED", None, f"{BH}/c/product/1558196-REG/nanlite_15_2017_pavotube_6c_10_rgbww.html"),
    ("Nanlite PavoTube II 15C RGB LED Tube (2')", "Nanlite", "LED", None, None),
    ("Nanlite PavoTube II 30C RGB LED Tube (4')", "Nanlite", "LED", None, None),
    ("Nanlite PavoTube T8-7X RGB LED Tube (2')", "Nanlite", "LED", None, None),
    ("Nanlite PavoSlim 60C RGBWW LED Panel", "Nanlite", "LED", None, None),
    ("Nanlite PavoSlim 120C RGBWW LED Panel", "Nanlite", "LED", None, None),
    ("Nanlite LitoLite 5C RGBWW Mini LED Panel", "Nanlite", "LED", None, f"{BH}/c/product/1592743-REG/nanlite_litolite5c_5c_rgbww_mini_led.html"),
    ("Nanlite MixPanel 60 RGBWW LED Panel", "Nanlite", "LED", None, None),
    ("Nanlite MixPanel 150 RGBWW LED Panel", "Nanlite", "LED", None, None),
    ("Nanlite Alien 150C RGB LED Panel", "Nanlite", "LED", None, f"{BH}/c/product/1826999-REG/nanlite_alien150c_alien_150c_rgbww_led.html"),
    ("Nanlite Alien 300C RGB LED Panel", "Nanlite", "LED", None, f"{BH}/c/product/1827000-REG/nanlite_alien300c_alien_300c_rgbww_led.html"),

    # Nanlux
    ("Nanlux Evoke 150C RGB LED Spotlight", "Nanlux", "LED", None, f"{BH}/c/product/1915217-REG/nanlux_ev150c_evoke_150c_rgb_led.html"),
    ("Nanlux Evoke 600C RGB LED Spotlight", "Nanlux", "LED", None, f"{BH}/c/product/1915218-REG/nanlux_ev600ckit_evoke_600c_rgb_led.html"),
    ("Nanlux Evoke 900C RGB LED Spotlight", "Nanlux", "LED", None, f"{BH}/c/product/1757822-REG/nanlux_nanlux_evoke_900c_st_kit_evoke_900c_led_spot.html"),
    ("Nanlux Evoke 1200 Daylight LED Spotlight", "Nanlux", "LED", None, f"{BH}/c/product/1641412-REG/nanlux_evoke_1200_led_light.html"),
    ("Nanlux Evoke 1200B Bi-Color LED Spotlight", "Nanlux", "LED", None, f"{BH}/c/product/1726270-REG/nanlux_evoke_1200b_led_bi_color.html"),
    ("Nanlux Evoke 2400B Bi-Color LED Monolight", "Nanlux", "LED", None, f"{BH}/c/product/1796782-REG/nanlux_ev2400bctnpg2bx_evoke_2400b_ctrn_with.html"),
    ("Nanlux TK-200 Daylight Soft Panel LED", "Nanlux", "LED", None, f"{BH}/c/product/1643216-REG/nanlux_tk_200_200w_daylight_soft_panel.html"),
    ("Nanlux TK-140B Bi-Color Soft Panel LED", "Nanlux", "LED", None, f"{BH}/c/product/1643215-REG/nanlux_tk_140b_140w_bi_color_soft_panel.html"),
    ("Nanlux TK-280B Bi-Color Soft Panel LED", "Nanlux", "LED", None, f"{BH}/c/product/1643217-REG/nanlux_tk_280b_280w_bi_color_soft_panel.html"),

    # Astera
    ("Astera Titan Tube RGB LED Tube (3.4')", "Astera", "LED", None, f"{BH}/c/product/1541950-REG/astera_fp1_individual_tube_titantube_72w_power.html"),
    ("Astera Helios Tube RGB LED Tube (1.8')", "Astera", "LED", None, f"{BH}/c/product/1541960-REG/astera_fp2_individual_tube_helios_tube_rgb_led.html"),
    ("Astera Hyperion LED Tube", "Astera", "LED", None, f"{BH}/c/product/1541965-REG/astera_fp_3_hyperion_tube.html"),
    ("Astera AX1 Pixel Tube RGB LED Tube (3.4')", "Astera", "LED", None, f"{BH}/c/product/1541915-REG/astera_ax1_wireless_pixeltube.html"),
    ("Astera AX3 LightDrop LED", "Astera", "LED", None, None),
    ("Astera AX5 TriplePAR LED", "Astera", "LED", None, None),
    ("Astera AX9 PowerPAR LED", "Astera", "LED", None, None),
    ("Astera AX10 SpotMax LED", "Astera", "LED", None, None),

    # Kino Flo
    ("Kino Flo Celeb 201 DMX LED Light", "Kino Flo", "LED", None, f"{BH}/c/product/1170490-REG/kino_flo_cel_201c_120u_celeb_201_dmx_led.html"),
    ("Kino Flo Celeb 401 DMX LED Light", "Kino Flo", "LED", None, None),
    ("Kino Flo Celeb IKON6 RGB LED Panel", "Kino Flo", "LED", None, f"{BH}/c/product/1903068-REG/kino_flo_ce3_00101_celeb_ikon_6_standard.html"),
    ("Kino Flo Diva-Lite LED 20 DMX", "Kino Flo", "LED", None, f"{BH}/c/product/1266723-REG/kino_flo_div_l20x_120u_diva_lite_led_20_dmx.html"),
    ("Kino Flo Diva Lux 4 RGB LED Panel", "Kino Flo", "LED", None, f"{BH}/c/product/1903044-REG/kino_flo_di3_00121_diva_lux_4_led.html"),
    ("Kino Flo FreeStyle Air RGB LED Panel", "Kino Flo", "LED", None, f"{BH}/c/product/1781033-REG/kino_flo_pan_air_freestyle_air_panel_only.html"),
    ("Kino Flo FreeStyle Air Max RGB LED Panel", "Kino Flo", "LED", None, f"{BH}/c/product/1781034-REG/kino_flo_pan_amax_freestyle_air_max_panel.html"),
    ("Kino Flo FreeStyle 21 LED DMX", "Kino Flo", "LED", None, None),
    ("Kino Flo FreeStyle 31 LED DMX", "Kino Flo", "LED", None, None),
    ("Kino Flo Select 20 LED DMX", "Kino Flo", "LED", None, None),
    ("Kino Flo Select 30 LED DMX", "Kino Flo", "LED", None, None),

    # Litepanels
    ("Litepanels Astra 3X Bi-Color LED Panel", "Litepanels", "LED", None, f"{BH}/c/product/1339834-REG/litepanels_935_2023_astra_3x_1x1_bi_color.html"),
    ("Litepanels Astra 3X Daylight LED Panel", "Litepanels", "LED", None, f"{BH}/c/product/1339833-REG/litepanels_935_2021_astra_3x_1x1_daylight.html"),
    ("Litepanels Astra 6X Bi-Color LED Panel", "Litepanels", "LED", None, f"{BH}/c/product/1339832-REG/litepanels_935_1023_astra_6x_1x1_bi_color.html"),
    ("Litepanels Astra 6X Daylight LED Panel", "Litepanels", "LED", None, f"{BH}/c/product/1339831-REG/litepanels_935_1021_astra_6x_1x1_daylight.html"),
    ("Litepanels Astra IP 1x1 Bi-Color LED Panel", "Litepanels", "LED", None, f"{BH}/c/product/1819775-REG/litepanels_936_1301_astra_ip_1x1_bi_color.html"),
    ("Litepanels Gemini 1x1 Hard RGB LED Panel", "Litepanels", "LED", None, f"{BH}/c/product/1632663-REG/litepanels_945_2301_gemini_1x1_hard_rgbww.html"),
    ("Litepanels Gemini 1x1 Soft RGB LED Panel", "Litepanels", "LED", None, f"{BH}/c/product/1466950-REG/litepanels_945_1301_gemini_1_x_1.html"),
    ("Litepanels Gemini 2x1 Soft RGB LED Panel", "Litepanels", "LED", None, None),

    # Profoto
    ("Profoto L600D Daylight Mono-LED Light", "Profoto", "LED", None, f"{BH}/c/product/1898698-REG/profoto_902020_l600d_daylight_mono_led_light.html"),
    ("Profoto L600C RGB Mono-LED Light", "Profoto", "LED", None, f"{BH}/c/product/1898699-REG/profoto_902022_l600c_rgb_mono_led_light.html"),
    ("Profoto L1600D Daylight Mono-LED Light", "Profoto", "LED", None, f"{BH}/c/product/1928129-REG/profoto_902011_l1600d_daylight_mono_led_light.html"),
    ("Profoto ProPanel 3x2 RGB LED Panel", "Profoto", "LED", None, f"{BH}/c/product/1898700-REG/profoto_903010_propanel_3x2_rgb_led.html"),

    # Quasar Science
    ("Quasar Science Rainbow 2 RGB LED Tube (2')", "Quasar Science", "LED", None, f"{BH}/c/product/1686097-REG/quasar_science_924_2301_rainbow_2_linear_led.html"),
    ("Quasar Science Rainbow 2 RGB LED Tube (4')", "Quasar Science", "LED", None, f"{BH}/c/product/1686098-REG/quasar_science_924_2302_rainbow_2_linear_led.html"),
    ("Quasar Science Rainbow 2 RGB LED Tube (8')", "Quasar Science", "LED", None, f"{BH}/c/product/1686129-REG/quasar_science_924_2303_rainbow_2_linear_led.html"),
    ("Quasar Science Q15 Daylight LED Tube (2')", "Quasar Science", "LED", None, f"{BH}/c/product/1555378-REG/quasar_science_q15w56t8_q15_5600k_2_tb.html"),
    ("Quasar Science Q30 Daylight LED Tube (4')", "Quasar Science", "LED", None, f"{BH}/c/product/1555380-REG/quasar_science_q30w56t8_q30_5600k_4_t8.html"),
    ("Quasar Science Crossfade X Bi-Color LED Tube", "Quasar Science", "LED", None, f"{BH}/c/product/1555373-REG/quasar_science_q25w2060xg_q25_x_crossfade_2_led.html"),

    # Creamsource
    ("Creamsource Vortex4 RGB LED Panel", "Creamsource", "LED", None, f"{BH}/c/product/1676321-REG/creamsource_k_csv_4_ess_vortex4_1x1_rgbw_led.html"),
    ("Creamsource Vortex8 RGB LED Panel", "Creamsource", "LED", None, f"{BH}/c/product/1578021-REG/creamsource_k_csv_8_ess_vortex8_2x1_rgbw_led.html"),
    ("Creamsource Vortex8 Soft RGB LED Panel", "Creamsource", "LED", None, f"{BH}/c/product/1883802-REG/creamsource_k_csv_8s_ess_vortex8_650w_rgbw_led.html"),
    ("Creamsource Vortex24 RGB LED Panel", "Creamsource", "LED", None, f"{BH}/c/product/1883798-REG/creamsource_k_csv_24_ess_vortex24_1950w_color_led.html"),
    ("Creamsource SpaceX RGBAW 1200W LED Light", "Creamsource", "LED", None, f"{BH}/c/product/1477292-REG/outsight_os_csx_1200_c_creamsource_spacex_1200_watt.html"),
    ("Creamsource Doppio+ Daylight LED Panel", "Creamsource", "LED", None, f"{BH}/c/product/1269217-REG/outsight_k_cs_2_d_pro_creamsource_doppio_daylight_led_panel.html"),
    ("Creamsource Mini Doppio+ Bender Bi-Color LED", "Creamsource", "LED", None, f"{BH}/c/product/1269237-REG/outsight_k_csm_2_b_ess_creamsource_mini_bender_bi_color_led.html"),

    # SUMOLIGHT
    ("SUMOLIGHT Sumospace+ Bi-Color LED", "SUMOLIGHT", "LED", None, f"{BH}/c/product/1551774-REG/sumolight_01_01_00_02_sumospace_bi_color_fixture_w_power.html"),
    ("SUMOLIGHT Sumomax Full-Color LED", "SUMOLIGHT", "LED", None, f"{BH}/c/product/1817496-REG/sumolight_07_07_01_01_sumomax_full_color_led_fixture.html"),
    ("SUMOLIGHT Sumo100+ LED Light", "SUMOLIGHT", "LED", None, None),
    ("SUMOLIGHT SKY Bar RGB LED Linear", "SUMOLIGHT", "LED", None, f"{BH}/c/product/1871095-REG/sumolight_lk_sky_xrhokt20_6_5_sky_led_linear.html"),

    # VELVETlight
    ("VELVETlight Velvet Light 1 Bi-Color LED Panel", "VELVETlight", "LED", None, f"{BH}/c/product/1396949-REG/velvetlight_vl1_ip54_vl1_rainproof_12x12.html"),
    ("VELVETlight Velvet Light 2 Bi-Color LED Panel", "VELVETlight", "LED", None, f"{BH}/c/product/1396952-REG/velvetlight_vl2_ip54_vl2_rainproof.html"),
    ("VELVETlight Velvet Light 2x2 Bi-Color LED Panel", "VELVETlight", "LED", None, f"{BH}/c/product/1396955-REG/velvetlight_vl2x2_led_panel.html"),
    ("VELVETlight Velvet Light 4 Bi-Color LED Panel", "VELVETlight", "LED", None, f"{BH}/c/product/1396956-REG/velvetlight_vl4_yoke_not_included.html"),
    ("VELVETlight Power 1 Flood Bi-Color LED Panel", "VELVETlight", "LED", None, f"{BH}/c/product/1396957-REG/velvetlight_vl1_ip54_power_flood_vl1_power_flood_rainproof.html"),
    ("VELVETlight Power 2 Flood Bi-Color LED Panel", "VELVETlight", "LED", None, f"{BH}/c/product/1396963-REG/velvetlight_vl2_ip54_power_flood_vl2_power_flood_rainproof.html"),

    # Lupo
    ("Lupo Superpanel Full Color 30 Soft LED", "Lupo", "LED", None, f"{BH}/c/product/1426916-REG/lupo_415_superpanel_1x1_full_color.html"),
    ("Lupo Superpanel Full Color 30 Hard LED", "Lupo", "LED", None, f"{BH}/c/product/1513960-REG/lupo_418_superpanel_full_color_30.html"),
    ("Lupo Superpanel Dual Color 60 Soft LED", "Lupo", "LED", None, f"{BH}/c/product/1478134-REG/lupo_414_superpanel_soft_60_dual.html"),
    ("Lupo Superpanel Dual Color 60 Hard LED", "Lupo", "LED", None, f"{BH}/c/product/1458845-REG/lupo_404_superpanel_bicolor_60_1x2.html"),
    ("Lupo Superpanel PRO Full Color 60 Soft LED", "Lupo", "LED", None, f"{BH}/c/product/1811601-REG/lupo_416_pro_superpanel_full_color_60.html"),
    ("Lupo UltrapanelPRO Full Color Hard 30 LED", "Lupo", "LED", None, f"{BH}/c/product/1780330-REG/lupo_817_pro_pol_ultrapanelpro_full_color_30.html"),
    ("Lupo Actionpanel Full Color Hard LED", "Lupo", "LED", None, f"{BH}/c/product/1513964-REG/lupo_602_actionpanel_full_color_panel.html"),
    ("Lupo Actionpanel Dual Color Hard LED", "Lupo", "LED", None, f"{BH}/c/product/1513962-REG/lupo_600_actionpanel_dual_color_panel.html"),

    # Fiilex
    ("Fiilex P3 Color LED Light", "Fiilex", "LED", None, f"{BH}/c/product/1687073-REG/fiilex_flxp3clr_p3_color_with_barndoor.html"),
    ("Fiilex P360 Pro Plus LED Light", "Fiilex", "LED", None, f"{BH}/c/product/1332084-REG/fiilex_flxp360pp_p360_pro_plus_includes.html"),
    ("Fiilex Q1000 5\" Fresnel LED Light", "Fiilex", "LED", None, f"{BH}/c/product/1137165-REG/fiilex_flxq1dc_q1000_5_fresnel_led.html"),
    ("Fiilex G6 Color Cinematic LED Ellipsoidal", "Fiilex", "LED", None, f"{BH}/c/product/1877844-REG/fiilex_flxg6clr_h1_kit_g6_color_led_light.html"),
    ("Fiilex Q10 Color-LR LED Fresnel", "Fiilex", "LED", None, f"{BH}/c/product/1877846-REG/fiilex_flxq10clrlr_a1_kit_q10_color_lr_led_light.html"),
    ("Fiilex Matrix LED Light", "Fiilex", "LED", None, f"{BH}/c/product/1246806-REG/fiilex_flxm1dc_m1_intelligent_matrix_bi_color.html"),

    # FotodioX
    ("FotodioX Pro Warrior 1000XR Bi-Color LED", "FotodioX", "LED", None, f"{BH}/c/product/1704980-REG/fotodiox_war1000xr_light_pro_warrior_1000xr_weather.html"),
    ("FotodioX Pro FACTOR Prizmo 300 RGB+W LED", "FotodioX", "LED", None, f"{BH}/c/product/1447221-REG/fotodiox_led_prizmo300_pro_factor_prizmo_300.html"),
    ("FotodioX Pro FACTOR V-2000ASVL Bi-Color LED", "FotodioX", "LED", None, f"{BH}/c/product/1333554-REG/fotodiox_v_2000asvl_pro_factor_1_x.html"),

    # Raya
    ("Raya Bi-Color 9\" Round LED Light Panel", "Raya", "LED", None, f"{BH}/c/product/1578520-REG/raya_r9_bi_led_9_inch_round_bi_color.html"),
    ("Raya LED-LA-RGB Dual RGB Bi-Color LED Lamp", "Raya", "LED", None, f"{BH}/c/product/1817195-REG/raya_led_la_rgb_dual_rgb_and.html"),

    # Zhiyun
    ("Zhiyun MOLUS G60 Bi-Color LED Monolight", "Zhiyun", "LED", None, None),
    ("Zhiyun MOLUS G200 Bi-Color LED Monolight", "Zhiyun", "LED", None, None),
    ("Zhiyun MOLUS X100 Bi-Color LED Monolight", "Zhiyun", "LED", None, None),
    ("Zhiyun FIVERAY M20 LED Light", "Zhiyun", "LED", None, None),
    ("Zhiyun FIVERAY M40 LED Light", "Zhiyun", "LED", None, None),
    ("Zhiyun FIVERAY F100 LED Light Stick", "Zhiyun", "LED", None, None),

    # Tilta
    ("Tilta Khronos RGB LED Panel (1x1)", "Tilta", "LED", None, None),
    ("Tilta Khronos RGB LED Panel (2x1)", "Tilta", "LED", None, None),

    # Broncolor
    ("Broncolor LED F160", "Broncolor", "LED", None, None),

    # K5600 (HMI)
    ("K 5600 Joker-Bug 200W HMI PAR", "K 5600", "HMI", None, f"{BH}/c/product/145676-REG/K5600_U0200B_Joker_Bug_200W_HMI_PAR.html"),
    ("K 5600 Joker-Bug 400W HMI", "K 5600", "HMI", None, None),
    ("K 5600 Joker2 800W HMI", "K 5600", "HMI", None, None),
    ("K 5600 Joker-Bug 1600W HMI", "K 5600", "HMI", None, None),

    # ARRI HMI
    ("ARRI M8 800W HMI", "ARRI", "HMI", None, None),
    ("ARRI M18 1800W HMI", "ARRI", "HMI", None, None),
    ("ARRI M40 4000W HMI", "ARRI", "HMI", None, None),
    ("ARRI M90 9000W HMI", "ARRI", "HMI", None, None),
    ("ARRI True Blue D5 HMI Fresnel", "ARRI", "HMI", None, None),
    ("ARRI True Blue D12 HMI Fresnel", "ARRI", "HMI", None, None),
    ("ARRI True Blue D25 HMI Fresnel", "ARRI", "HMI", None, None),
    ("ARRI Compact 200 HMI Fresnel", "ARRI", "HMI", None, None),
    ("ARRI Compact 575 HMI Fresnel", "ARRI", "HMI", None, None),
    ("ARRI Compact 1200 HMI Fresnel", "ARRI", "HMI", None, None),
    ("ARRI Compact 2500 HMI Fresnel", "ARRI", "HMI", None, None),
    ("ARRI Compact 4000 HMI Fresnel", "ARRI", "HMI", None, None),
]

# ═══════════════════════════════════════════════════════════════════
# CAMERA PRODUCTS
# ═══════════════════════════════════════════════════════════════════
CAMERAS = [
    # Sony Mirrorless
    ("Sony a1 II Mirrorless Camera", "Sony", "Mirrorless", 6498, None),
    ("Sony a1 Mirrorless Camera", "Sony", "Mirrorless", 6498, None),
    ("Sony a9 III Mirrorless Camera", "Sony", "Mirrorless", 5998, None),
    ("Sony a7 V Mirrorless Camera", "Sony", "Mirrorless", 2898, None),
    ("Sony a7R V Mirrorless Camera", "Sony", "Mirrorless", 3298, None),
    ("Sony a7S III Mirrorless Camera", "Sony", "Mirrorless", 3498, None),
    ("Sony a7C II Mirrorless Camera", "Sony", "Mirrorless", 2198, None),
    ("Sony a7CR Mirrorless Camera", "Sony", "Mirrorless", 2998, None),
    ("Sony a7 IV Mirrorless Camera", "Sony", "Mirrorless", 1998, None),
    ("Sony a7 III Mirrorless Camera", "Sony", "Mirrorless", 1698, None),
    ("Sony a6700 Mirrorless Camera", "Sony", "Mirrorless", 1398, None),
    ("Sony ZV-E10 II Mirrorless Camera", "Sony", "Mirrorless", 998, None),
    ("Sony ZV-E1 Mirrorless Camera", "Sony", "Mirrorless", 2198, None),

    # Canon Mirrorless
    ("Canon EOS R1 Mirrorless Camera", "Canon", "Mirrorless", 6299, None),
    ("Canon EOS R5 Mark II Mirrorless Camera", "Canon", "Mirrorless", 3899, None),
    ("Canon EOS R5 C Mirrorless Cinema Camera", "Canon", "Mirrorless", 3899, None),
    ("Canon EOS R5 Mirrorless Camera", "Canon", "Mirrorless", 2799, None),
    ("Canon EOS R6 Mark III Mirrorless Camera", "Canon", "Mirrorless", 2799, None),
    ("Canon EOS R6 Mark II Mirrorless Camera", "Canon", "Mirrorless", 1999, None),
    ("Canon EOS R8 Mirrorless Camera", "Canon", "Mirrorless", 1299, None),
    ("Canon EOS R7 Mirrorless Camera", "Canon", "Mirrorless", 1299, None),
    ("Canon EOS R10 Mirrorless Camera", "Canon", "Mirrorless", 879, None),
    ("Canon EOS R50 V Mirrorless Camera", "Canon", "Mirrorless", 799, None),
    ("Canon EOS R50 Mirrorless Camera", "Canon", "Mirrorless", 599, None),
    ("Canon EOS R100 Mirrorless Camera", "Canon", "Mirrorless", 399, None),

    # Nikon Mirrorless
    ("Nikon Z9 Mirrorless Camera", "Nikon", "Mirrorless", 5496, None),
    ("Nikon Z8 Mirrorless Camera", "Nikon", "Mirrorless", 3796, None),
    ("Nikon Z7 II Mirrorless Camera", "Nikon", "Mirrorless", 2596, None),
    ("Nikon Z6 III Mirrorless Camera", "Nikon", "Mirrorless", 2496, None),
    ("Nikon Z5 II Mirrorless Camera", "Nikon", "Mirrorless", 1596, None),
    ("Nikon Zf Mirrorless Camera", "Nikon", "Mirrorless", 1996, None),
    ("Nikon Z50 II Mirrorless Camera", "Nikon", "Mirrorless", 959, None),
    ("Nikon Z30 Mirrorless Camera", "Nikon", "Mirrorless", 609, None),

    # FUJIFILM Mirrorless
    ("FUJIFILM X-H2S Mirrorless Camera", "FUJIFILM", "Mirrorless", 2499, None),
    ("FUJIFILM X-H2 Mirrorless Camera", "FUJIFILM", "Mirrorless", 1999, None),
    ("FUJIFILM X-T5 Mirrorless Camera", "FUJIFILM", "Mirrorless", 1699, None),
    ("FUJIFILM X-T30 III Mirrorless Camera", "FUJIFILM", "Mirrorless", 899, None),
    ("FUJIFILM X-S20 Mirrorless Camera", "FUJIFILM", "Mirrorless", 1299, None),
    ("FUJIFILM X-M5 Mirrorless Camera", "FUJIFILM", "Mirrorless", 799, None),
    ("FUJIFILM X-E5 Mirrorless Camera", "FUJIFILM", "Mirrorless", 1399, None),
    ("FUJIFILM GFX100 II Medium Format Camera", "FUJIFILM", "Medium Format", 7499, None),
    ("FUJIFILM GFX100S II Medium Format Camera", "FUJIFILM", "Medium Format", 4999, None),
    ("FUJIFILM GFX50S II Medium Format Camera", "FUJIFILM", "Medium Format", 3499, None),

    # Panasonic Mirrorless
    ("Panasonic LUMIX S5 IIX Mirrorless Camera", "Panasonic", "Mirrorless", 2197, None),
    ("Panasonic LUMIX S5 II Mirrorless Camera", "Panasonic", "Mirrorless", 1997, None),
    ("Panasonic LUMIX S1 II Mirrorless Camera", "Panasonic", "Mirrorless", 2497, None),
    ("Panasonic LUMIX S1H Mirrorless Camera", "Panasonic", "Mirrorless", 3497, None),
    ("Panasonic LUMIX GH7 Mirrorless Camera", "Panasonic", "Mirrorless", 2197, None),
    ("Panasonic LUMIX GH6 Mirrorless Camera", "Panasonic", "Mirrorless", 1797, None),
    ("Panasonic LUMIX G9 II Mirrorless Camera", "Panasonic", "Mirrorless", 1797, None),

    # Leica
    ("Leica SL3 Mirrorless Camera", "Leica", "Mirrorless", 6595, None),
    ("Leica SL2-S Mirrorless Camera", "Leica", "Mirrorless", 4895, None),
    ("Leica Q3 Compact Camera", "Leica", "Point & Shoot", 5795, None),
    ("Leica M11-P Digital Rangefinder", "Leica", "Mirrorless", 9195, None),

    # Hasselblad
    ("Hasselblad X2D II 100C Medium Format Camera", "Hasselblad", "Medium Format", 7399, None),
    ("Hasselblad X2D 100C Medium Format Camera", "Hasselblad", "Medium Format", 5999, None),
    ("Hasselblad 907X & CFV 100C Medium Format", "Hasselblad", "Medium Format", 5999, None),

    # OM SYSTEM / Olympus
    ("OM SYSTEM OM-1 Mark II Mirrorless Camera", "OM SYSTEM", "Mirrorless", 2199, None),
    ("OM SYSTEM OM-1 Mirrorless Camera", "OM SYSTEM", "Mirrorless", 1999, None),
    ("OM SYSTEM OM-5 Mirrorless Camera", "OM SYSTEM", "Mirrorless", 1199, None),
    ("Olympus OM-D E-M10 Mark IV Mirrorless Camera", "Olympus", "Mirrorless", 699, None),

    # Sigma
    ("Sigma fp L Mirrorless Camera", "Sigma", "Mirrorless", 2499, None),
    ("Sigma fp Mirrorless Camera", "Sigma", "Mirrorless", 1799, None),

    # Cinema Cameras
    ("ARRI ALEXA 35 Cinema Camera", "ARRI", "Cinema", 78600, None),
    ("ARRI ALEXA Mini LF Cinema Camera", "ARRI", "Cinema", 52150, None),
    ("ARRI ALEXA Mini Cinema Camera", "ARRI", "Cinema", None, None),
    ("ARRI AMIRA Cinema Camera", "ARRI", "Cinema", None, None),
    ("RED V-RAPTOR XL 8K VV Cinema Camera", "RED", "Cinema", None, None),
    ("RED V-RAPTOR 8K S35 Cinema Camera", "RED", "Cinema", None, None),
    ("RED KOMODO-X 6K Cinema Camera", "RED", "Cinema", None, None),
    ("RED KOMODO 6K Cinema Camera", "RED", "Cinema", None, None),
    ("RED DSMC3 V-RAPTOR 8K VV Cinema Camera", "RED", "Cinema", None, None),
    ("Sony FX9 Full-Frame 6K Cinema Camera", "Sony", "Cinema", 10998, None),
    ("Sony FX6 Full-Frame Cinema Camera", "Sony", "Cinema", 5998, None),
    ("Sony FX3 Full-Frame Cinema Camera", "Sony", "Cinema", 3898, None),
    ("Sony FX30 Cinema Camera", "Sony", "Cinema", 1798, None),
    ("Sony BURANO 8K Cinema Camera", "Sony", "Cinema", 24800, None),
    ("Sony VENICE 2 8K Cinema Camera", "Sony", "Cinema", None, None),
    ("Canon EOS C400 Cinema Camera", "Canon", "Cinema", 7499, None),
    ("Canon EOS C80 Cinema Camera", "Canon", "Cinema", 5499, None),
    ("Canon EOS C70 Cinema Camera", "Canon", "Cinema", 4499, None),
    ("Canon EOS C500 Mark II Cinema Camera", "Canon", "Cinema", 15999, None),
    ("Canon EOS C300 Mark III Cinema Camera", "Canon", "Cinema", 10999, None),
    ("Canon EOS C200 Cinema Camera", "Canon", "Cinema", None, None),
    ("Blackmagic Design URSA Mini Pro 12K", "Blackmagic Design", "Cinema", 5995, None),
    ("Blackmagic Design URSA Mini Pro G2", "Blackmagic Design", "Cinema", 5995, None),
    ("Blackmagic Design URSA Cine 12K LF", "Blackmagic Design", "Cinema", 14995, None),
    ("Blackmagic Design Pocket Cinema Camera 6K G2", "Blackmagic Design", "Cinema", 1995, None),
    ("Blackmagic Design Pocket Cinema Camera 6K Pro", "Blackmagic Design", "Cinema", 2495, None),
    ("Blackmagic Design Pocket Cinema Camera 4K", "Blackmagic Design", "Cinema", 1295, None),
    ("Blackmagic Design Cinema Camera 6K", "Blackmagic Design", "Cinema", 2595, None),
    ("Blackmagic Design PYXIS 6K Cinema Camera", "Blackmagic Design", "Cinema", 2195, None),
    ("Panasonic LUMIX BS1H Cinema Camera", "Panasonic", "Cinema", 3497, None),
    ("Panasonic AU-EVA1 5.7K Cinema Camera", "Panasonic", "Cinema", 7195, None),
    ("Panasonic VariCam LT 4K Cinema Camera", "Panasonic", "Cinema", None, None),
    ("DJI Ronin 4D-8K Cinema Camera", "DJI", "Cinema", 7359, None),
    ("DJI Ronin 4D-6K Cinema Camera", "DJI", "Cinema", 4599, None),
    ("Z CAM E2-S6 6K Cinema Camera", "Z CAM", "Cinema", None, None),
    ("Z CAM E2 4K Cinema Camera", "Z CAM", "Cinema", None, None),
    ("Z CAM E2-F6 6K Full-Frame Cinema Camera", "Z CAM", "Cinema", None, None),
    ("Z CAM E2-F8 8K Full-Frame Cinema Camera", "Z CAM", "Cinema", None, None),
    ("Kinefinity MAVO Edge 8K Cinema Camera", "Kinefinity", "Cinema", None, None),
    ("Kinefinity MAVO LF Cinema Camera", "Kinefinity", "Cinema", None, None),
    ("FREEFLY Ember S5K Cinema Camera", "FREEFLY", "Cinema", None, None),
    ("Kodak Super 8 Camera", "Kodak", "Cinema", None, None),

    # DSLR
    ("Canon EOS-1D X Mark III DSLR", "Canon", "DSLR", 5499, None),
    ("Canon EOS 5D Mark IV DSLR", "Canon", "DSLR", 2499, None),
    ("Canon EOS 6D Mark II DSLR", "Canon", "DSLR", 1199, None),
    ("Canon EOS 90D DSLR", "Canon", "DSLR", 1199, None),
    ("Nikon D6 DSLR", "Nikon", "DSLR", 6496, None),
    ("Nikon D850 DSLR", "Nikon", "DSLR", 2796, None),
    ("Nikon D780 DSLR", "Nikon", "DSLR", 2196, None),
    ("Nikon D500 DSLR", "Nikon", "DSLR", 1496, None),
    ("Pentax K-3 Mark III DSLR", "Pentax", "DSLR", 1999, None),
    ("Pentax K-1 Mark II DSLR", "Pentax", "DSLR", 1796, None),

    # Point & Shoot
    ("Sony RX100 VII Compact Camera", "Sony", "Point & Shoot", 1298, None),
    ("Sony RX1R II Compact Camera", "Sony", "Point & Shoot", 3298, None),
    ("Sony ZV-1 II Vlog Camera", "Sony", "Point & Shoot", 898, None),
    ("Canon PowerShot V10 Vlog Camera", "Canon", "Point & Shoot", 329, None),
    ("Canon PowerShot G7 X Mark III", "Canon", "Point & Shoot", 749, None),
    ("FUJIFILM X100VI Compact Camera", "FUJIFILM", "Point & Shoot", 1599, None),
    ("Nikon Zf Mirrorless Camera", "Nikon", "Mirrorless", 1996, None),
    ("Ricoh GR IIIx Compact Camera", "Ricoh", "Point & Shoot", 999, None),
    ("Ricoh GR III Compact Camera", "Ricoh", "Point & Shoot", 899, None),
]

# ═══════════════════════════════════════════════════════════════════
# LENS PRODUCTS (abbreviated — will expand in subsequent runs)
# ═══════════════════════════════════════════════════════════════════
LENSES = [
    # Sony FE (Full Frame Mirrorless)
    ("Sony FE 24-70mm f/2.8 GM II", "Sony", "Mirrorless", 2298, None),
    ("Sony FE 70-200mm f/2.8 GM OSS II", "Sony", "Mirrorless", 2798, None),
    ("Sony FE 16-35mm f/2.8 GM II", "Sony", "Mirrorless", 2298, None),
    ("Sony FE 14mm f/1.8 GM", "Sony", "Mirrorless", 1598, None),
    ("Sony FE 24mm f/1.4 GM", "Sony", "Mirrorless", 1398, None),
    ("Sony FE 35mm f/1.4 GM", "Sony", "Mirrorless", 1398, None),
    ("Sony FE 50mm f/1.2 GM", "Sony", "Mirrorless", 1998, None),
    ("Sony FE 50mm f/1.4 GM", "Sony", "Mirrorless", 1298, None),
    ("Sony FE 85mm f/1.4 GM", "Sony", "Mirrorless", 1598, None),
    ("Sony FE 100-400mm f/4.5-5.6 GM OSS", "Sony", "Mirrorless", 2498, None),
    ("Sony FE 200-600mm f/5.6-6.3 G OSS", "Sony", "Mirrorless", 1998, None),
    ("Sony FE 600mm f/4 GM OSS", "Sony", "Mirrorless", 12998, None),
    ("Sony FE 12-24mm f/2.8 GM", "Sony", "Mirrorless", 2798, None),
    ("Sony FE 100mm f/2.8 STF GM OSS", "Sony", "Mirrorless", 1498, None),
    ("Sony FE 135mm f/1.8 GM", "Sony", "Mirrorless", 1898, None),
    ("Sony FE 300mm f/2.8 GM OSS", "Sony", "Mirrorless", 5998, None),
    ("Sony FE 28-70mm f/2 GM", "Sony", "Mirrorless", 2798, None),

    # Canon RF
    ("Canon RF 24-70mm f/2.8 L IS USM", "Canon", "Mirrorless", 2399, None),
    ("Canon RF 70-200mm f/2.8 L IS USM", "Canon", "Mirrorless", 2699, None),
    ("Canon RF 15-35mm f/2.8 L IS USM", "Canon", "Mirrorless", 2399, None),
    ("Canon RF 28-70mm f/2 L USM", "Canon", "Mirrorless", 2999, None),
    ("Canon RF 50mm f/1.2 L USM", "Canon", "Mirrorless", 2299, None),
    ("Canon RF 85mm f/1.2 L USM", "Canon", "Mirrorless", 2699, None),
    ("Canon RF 100-500mm f/4.5-7.1 L IS USM", "Canon", "Mirrorless", 2899, None),
    ("Canon RF 100mm f/2.8 L Macro IS USM", "Canon", "Mirrorless", 1399, None),
    ("Canon RF 35mm f/1.4 L VCM", "Canon", "Mirrorless", 1499, None),
    ("Canon RF 14-35mm f/4 L IS USM", "Canon", "Mirrorless", 1599, None),
    ("Canon RF 24-105mm f/4 L IS USM", "Canon", "Mirrorless", 1099, None),
    ("Canon RF 135mm f/1.4 L VCM", "Canon", "Mirrorless", 2349, None),
    ("Canon RF 200-800mm f/6.3-9 IS USM", "Canon", "Mirrorless", 1899, None),

    # Nikon Z
    ("Nikon NIKKOR Z 24-70mm f/2.8 S", "Nikon", "Mirrorless", 2196, None),
    ("Nikon NIKKOR Z 70-200mm f/2.8 VR S", "Nikon", "Mirrorless", 2596, None),
    ("Nikon NIKKOR Z 14-24mm f/2.8 S", "Nikon", "Mirrorless", 2396, None),
    ("Nikon NIKKOR Z 50mm f/1.2 S", "Nikon", "Mirrorless", 2096, None),
    ("Nikon NIKKOR Z 85mm f/1.2 S", "Nikon", "Mirrorless", 2596, None),
    ("Nikon NIKKOR Z 135mm f/1.8 S Plena", "Nikon", "Mirrorless", 2496, None),
    ("Nikon NIKKOR Z 35mm f/1.4", "Nikon", "Mirrorless", 596, None),
    ("Nikon NIKKOR Z 100-400mm f/4.5-5.6 VR S", "Nikon", "Mirrorless", 2696, None),
    ("Nikon NIKKOR Z 400mm f/2.8 TC VR S", "Nikon", "Mirrorless", 13996, None),
    ("Nikon NIKKOR Z 600mm f/4 TC VR S", "Nikon", "Mirrorless", 15496, None),
    ("Nikon NIKKOR Z 28-400mm f/4-8 VR", "Nikon", "Mirrorless", 1296, None),

    # Sigma (Mirrorless)
    ("Sigma 24-70mm f/2.8 DG DN Art", "Sigma", "Mirrorless", 1099, None),
    ("Sigma 70-200mm f/2.8 DG DN OS Sport", "Sigma", "Mirrorless", 1499, None),
    ("Sigma 14-24mm f/2.8 DG DN Art", "Sigma", "Mirrorless", 1399, None),
    ("Sigma 35mm f/1.4 DG DN Art", "Sigma", "Mirrorless", 899, None),
    ("Sigma 50mm f/1.4 DG DN Art", "Sigma", "Mirrorless", 899, None),
    ("Sigma 85mm f/1.4 DG DN Art", "Sigma", "Mirrorless", 1099, None),
    ("Sigma 105mm f/2.8 DG DN Macro Art", "Sigma", "Mirrorless", 799, None),
    ("Sigma 150-600mm f/5-6.3 DG DN OS Sport", "Sigma", "Mirrorless", 1499, None),
    ("Sigma 60-600mm f/4.5-6.3 DG DN OS Sport", "Sigma", "Mirrorless", 1999, None),
    ("Sigma 28-45mm f/1.8 DG DN Art", "Sigma", "Mirrorless", 1299, None),
    ("Sigma 500mm f/5.6 DG DN OS Sport", "Sigma", "Mirrorless", 2799, None),

    # Tamron
    ("Tamron 28-75mm f/2.8 Di III VXD G2", "Tamron", "Mirrorless", 879, None),
    ("Tamron 70-180mm f/2.8 Di III VXD G2", "Tamron", "Mirrorless", 1199, None),
    ("Tamron 17-28mm f/2.8 Di III RXD", "Tamron", "Mirrorless", 899, None),
    ("Tamron 35-150mm f/2-2.8 Di III VXD", "Tamron", "Mirrorless", 1899, None),
    ("Tamron 50-400mm f/4.5-6.3 Di III VC VXD", "Tamron", "Mirrorless", 1299, None),
    ("Tamron 150-500mm f/5-6.7 Di III VC VXD", "Tamron", "Mirrorless", 1399, None),

    # ZEISS
    ("ZEISS Otus 55mm f/1.4 ZF.2", "ZEISS", "SLR", 3990, None),
    ("ZEISS Milvus 35mm f/1.4 ZF.2", "ZEISS", "SLR", 1843, None),
    ("ZEISS Milvus 50mm f/1.4 ZF.2", "ZEISS", "SLR", 1199, None),
    ("ZEISS Milvus 85mm f/1.4 ZF.2", "ZEISS", "SLR", 1710, None),
    ("ZEISS Batis 25mm f/2", "ZEISS", "Mirrorless", 1299, None),
    ("ZEISS Batis 40mm f/2 CF", "ZEISS", "Mirrorless", 1299, None),
    ("ZEISS Batis 85mm f/1.8", "ZEISS", "Mirrorless", 1199, None),
    ("ZEISS Batis 135mm f/2.8", "ZEISS", "Mirrorless", 1999, None),

    # Cine Lenses
    ("ARRI Signature Prime 35mm T1.8", "ARRI", "Cine", 26500, None),
    ("ARRI Signature Prime 50mm T1.8", "ARRI", "Cine", 26500, None),
    ("ARRI Signature Prime 75mm T1.8", "ARRI", "Cine", 26500, None),
    ("ARRI Signature Prime 125mm T1.8", "ARRI", "Cine", 26500, None),
    ("ARRI Signature Zoom 45-135mm T2.8", "ARRI", "Cine", 38000, None),
    ("ARRI Signature Zoom 16-32mm T2.8", "ARRI", "Cine", 38000, None),
    ("ARRI Ultra Prime 24mm T1.9", "ARRI", "Cine", None, None),
    ("ARRI Ultra Prime 50mm T1.9", "ARRI", "Cine", None, None),
    ("ARRI Ultra Prime 85mm T1.9", "ARRI", "Cine", None, None),
    ("Cooke S7/i 25mm T2.0", "Cooke", "Cine", None, None),
    ("Cooke S7/i 50mm T2.0", "Cooke", "Cine", None, None),
    ("Cooke S7/i 75mm T2.0", "Cooke", "Cine", None, None),
    ("Cooke S4/i 25mm T2", "Cooke", "Cine", None, None),
    ("Cooke S4/i 50mm T2", "Cooke", "Cine", None, None),
    ("Cooke S4/i 75mm T2", "Cooke", "Cine", None, None),
    ("Cooke Anamorphic/i SF 50mm T2.3", "Cooke", "Cine", None, None),
    ("Cooke Anamorphic/i SF 75mm T2.3", "Cooke", "Cine", None, None),
    ("Angenieux EZ-1 30-90mm T2 (S35)", "Angenieux", "Cine", None, None),
    ("Angenieux EZ-2 15-40mm T2 (S35)", "Angenieux", "Cine", None, None),
    ("Angenieux Optimo Ultra 12X 24-290mm", "Angenieux", "Cine", None, None),
    ("ZEISS Supreme Prime 25mm T1.5", "ZEISS", "Cine", 17990, None),
    ("ZEISS Supreme Prime 35mm T1.5", "ZEISS", "Cine", 17990, None),
    ("ZEISS Supreme Prime 50mm T1.5", "ZEISS", "Cine", 17990, None),
    ("ZEISS Supreme Prime 85mm T1.5", "ZEISS", "Cine", 17990, None),
    ("ZEISS CP.3 25mm T2.1", "ZEISS", "Cine", 4490, None),
    ("ZEISS CP.3 35mm T2.1", "ZEISS", "Cine", 4490, None),
    ("ZEISS CP.3 50mm T2.1", "ZEISS", "Cine", 4490, None),
    ("ZEISS CP.3 85mm T2.1", "ZEISS", "Cine", 4490, None),
    ("Atlas Lens Co. Orion 2x Anamorphic 40mm T2", "Atlas Lens Co.", "Cine", 8900, None),
    ("Atlas Lens Co. Orion 2x Anamorphic 65mm T2", "Atlas Lens Co.", "Cine", 8900, None),
    ("Atlas Lens Co. Orion 2x Anamorphic 100mm T2", "Atlas Lens Co.", "Cine", 8900, None),
    ("Atlas Lens Co. Mercury 1.5x Anamorphic 40mm T2.2", "Atlas Lens Co.", "Cine", 5500, None),
    ("DZOFilm Vespid 25mm T2.1", "DZOFilm", "Cine", 499, None),
    ("DZOFilm Vespid 50mm T2.1", "DZOFilm", "Cine", 499, None),
    ("DZOFilm Vespid 75mm T2.1", "DZOFilm", "Cine", 499, None),
    ("DZOFilm Vespid 100mm Macro T2.8", "DZOFilm", "Cine", 549, None),
    ("DZOFilm Pictor 20-55mm T2.8 Zoom", "DZOFilm", "Cine", 4999, None),
    ("DZOFilm Pictor 50-125mm T2.8 Zoom", "DZOFilm", "Cine", 4999, None),
    ("Sigma 18-35mm T2 Cine", "Sigma", "Cine", 3999, None),
    ("Sigma 50-100mm T2 Cine", "Sigma", "Cine", 3999, None),
    ("Sigma FF Classic Art Prime 40mm T1.5", "Sigma", "Cine", 4999, None),
    ("Canon CN-E 24mm T1.5 L F", "Canon", "Cine", None, None),
    ("Canon CN-E 35mm T1.5 L F", "Canon", "Cine", None, None),
    ("Canon CN-E 50mm T1.3 L F", "Canon", "Cine", None, None),
    ("Canon CN-E 85mm T1.3 L F", "Canon", "Cine", None, None),
    ("Canon CN-E 135mm T2.2 L F", "Canon", "Cine", None, None),
    ("Leitz Cine HUGO 24mm T1.5", "Leitz Cine", "Cine", None, None),
    ("Leitz Cine HUGO 35mm T1.5", "Leitz Cine", "Cine", None, None),
    ("Leitz Cine HUGO 50mm T1.5", "Leitz Cine", "Cine", None, None),

    # Venus Optics / Laowa
    ("Venus Optics Laowa 12mm f/2.8 Zero-D", "Venus Optics", "Mirrorless", 899, None),
    ("Venus Optics Laowa 14mm f/4 Zero-D DSLR", "Venus Optics", "SLR", 499, None),
    ("Venus Optics Laowa 15mm f/2 Zero-D", "Venus Optics", "Mirrorless", 849, None),
    ("Venus Optics Laowa 24mm f/14 Probe", "Venus Optics", "Cine", 1499, None),
    ("Venus Optics Laowa Nanomorph 35mm T2.4 1.5x", "Venus Optics", "Cine", 1199, None),
    ("Venus Optics Laowa Nanomorph 50mm T2.4 1.5x", "Venus Optics", "Cine", 1199, None),
    ("Venus Optics Laowa Nanomorph 65mm T2.4 1.5x", "Venus Optics", "Cine", 1199, None),
    ("Venus Optics Laowa Proteus 2x Anamorphic 35mm T2", "Venus Optics", "Cine", 4999, None),
    ("Venus Optics Laowa Proteus 2x Anamorphic 50mm T2", "Venus Optics", "Cine", 4999, None),

    # Viltrox
    ("Viltrox AF 85mm f/1.8 II FE", "Viltrox", "Mirrorless", 399, None),
    ("Viltrox AF 56mm f/1.7 FE", "Viltrox", "Mirrorless", 299, None),
    ("Viltrox AF 27mm f/1.2 (APS-C)", "Viltrox", "Mirrorless", 399, None),
    ("Viltrox AF 75mm f/1.2 (APS-C)", "Viltrox", "Mirrorless", 399, None),
    ("Viltrox AF 13mm f/1.4 (APS-C)", "Viltrox", "Mirrorless", 329, None),

    # Sirui
    ("Sirui 50mm f/1.8 1.33x Anamorphic", "Sirui", "Mirrorless", 299, None),
    ("Sirui 35mm f/1.8 1.33x Anamorphic", "Sirui", "Mirrorless", 299, None),
    ("Sirui 24mm f/2.8 1.33x Anamorphic", "Sirui", "Mirrorless", 299, None),
    ("Sirui 75mm f/1.8 1.33x Anamorphic", "Sirui", "Mirrorless", 299, None),
    ("Sirui Saturn 35mm T2.9 1.6x Anamorphic", "Sirui", "Cine", 1099, None),
]


def main():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    all_products = []

    # Process lighting
    for name, brand, subcat, price, url in LIGHTING:
        sku = sku_from_url(url) if url else None
        all_products.append({
            "name": name,
            "brand": brand,
            "category": "Lighting",
            "subcategory": subcat,
            "price": price,
            "bhphoto_url": url,
            "bhphoto_sku": sku,
        })

    # Process cameras
    for name, brand, subcat, price, url in CAMERAS:
        sku = sku_from_url(url) if url else None
        all_products.append({
            "name": name,
            "brand": brand,
            "category": "Cameras",
            "subcategory": subcat,
            "price": price,
            "bhphoto_url": url,
            "bhphoto_sku": sku,
        })

    # Process lenses
    for name, brand, subcat, price, url in LENSES:
        sku = sku_from_url(url) if url else None
        all_products.append({
            "name": name,
            "brand": brand,
            "category": "Lenses",
            "subcategory": subcat,
            "price": price,
            "bhphoto_url": url,
            "bhphoto_sku": sku,
        })

    print(f"Total products to insert: {len(all_products)}")
    print(f"  Lighting: {sum(1 for p in all_products if p['category'] == 'Lighting')}")
    print(f"  Cameras:  {sum(1 for p in all_products if p['category'] == 'Cameras')}")
    print(f"  Lenses:   {sum(1 for p in all_products if p['category'] == 'Lenses')}")
    print(f"  With B&H URL: {sum(1 for p in all_products if p['bhphoto_url'])}")

    # Insert in batches of 100
    batch_size = 100
    inserted = 0
    errors = 0
    for i in range(0, len(all_products), batch_size):
        batch = all_products[i:i+batch_size]
        try:
            result = sb.table("products").upsert(
                batch,
                on_conflict="bhphoto_sku",
            ).execute()
            inserted += len(batch)
            print(f"  Batch {i//batch_size + 1}: inserted {len(batch)} products")
        except Exception as e:
            # Some products don't have SKUs, insert individually
            for p in batch:
                try:
                    sb.table("products").insert(p).execute()
                    inserted += 1
                except Exception as e2:
                    errors += 1
                    if errors <= 5:
                        print(f"  Error: {p['name']}: {e2}")
        time.sleep(0.5)

    print(f"\nDone! Inserted: {inserted}, Errors: {errors}")

    # Verify
    result = sb.table("products").select("category", count="exact").execute()
    print(f"Total rows in DB: {result.count}")

if __name__ == "__main__":
    main()
