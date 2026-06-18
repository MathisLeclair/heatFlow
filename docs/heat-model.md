# HeatFlow — Heat Model

This document describes every computation performed by `src/sim/simulate.ts`.

---

## 1. Overview

Each room is modelled as a single **lumped thermal capacitance**: one temperature for the whole room, updated every time step. Heat flows in or out through four mechanisms:

| Mechanism | Driver |
|---|---|
| Conduction | Temperature difference across walls and closed openings |
| Ventilation | Air exchange through open windows/doors (natural or forced) |
| Solar gain | Irradiance on exterior walls and glazing |
| Equipment | Portable AC (heat sink); housing type effects (roof, ground slab) |

The governing ODE for each room *i*:

```
C_i · dT_i/dt = Q_cond,i + Q_vent,i + Q_solar,i + Q_AC,i + Q_roof,i + Q_floor,i
```

where `C_i` is the thermal capacitance (J/K) and `Q_*` are net heat flows (W, positive = heating the room).

---

## 2. Thermal Capacitance

```
C_i = ρ_air · cp_air · V_i · m_i
```

| Symbol | Value | Description |
|---|---|---|
| ρ\_air | 1.2 kg/m³ | Air density |
| cp\_air | 1005 J/(kg·K) | Specific heat of air |
| V\_i | A\_floor × h\_ceiling (m³) | Room air volume |
| m\_i | 3–15 (user-set) | Thermal mass multiplier |

The multiplier accounts for furniture, inner wall surfaces, and structural mass that buffer temperature changes. A bare concrete room might use 10–12×; a sparsely furnished room 3–5×.

---

## 3. Conduction

Applied to **opaque wall fabric** and **closed openings** (windows/doors).

```
Q_cond = G · (T_b − T_a)      [W]
G = U · A                      [W/K]
```

**Wall U-value:**

```
U_wall = 1 / (R_fabric + R_surface_films)
```

- `R_fabric` = R-value of the wall type scaled linearly to the actual thickness:  
  `R_fabric = R_ref × (thickness / thickness_ref)`
- `R_surface_films` = 0.17 m²·K/W (interior 0.13 + exterior 0.04, per ISO 6946)

**Area:**

```
A_solid = max(0.1,  wall_length × wall_height − Σ opening_areas)
```

Wall height is the minimum ceiling height of the two adjacent rooms.

**Closed opening U-value** comes directly from the glazing preset (e.g. 2.8 W/(m²·K) for double glazing).

---

## 4. Natural Ventilation

Applied to **open openings** (windows and doors).

### 4.1 Volumetric flow rate

```
V̇ = (V̇_stack + V̇_breeze) × boost     [m³/s]
```

**Stack effect (buoyancy-driven):**

```
V̇_stack = (Cd / 3) · A · √(g · h · |ΔT| / T_avg_K)
```

| Symbol | Value | Description |
|---|---|---|
| Cd | 0.60–0.65 | Discharge coefficient (orifice efficiency) |
| A | m² | Opening area (width × height) |
| g | 9.81 m/s² | Gravitational acceleration |
| h | m | Opening clear height (stack driving height) |
| ΔT | K | \|T\_room − T\_outside\| |
| T\_avg\_K | K | (T\_room + T\_outside)/2 + 273.15 |

The Cd/3 factor is the ASHRAE approximation for a single orifice in a uniform pressure field.

**Wind-driven (breeze) component:**

```
V̇_breeze = Cd · A · v_wind · breezeFactor
v_wind = 0.12 m/s  (baseline ambient breeze)
breezeFactor = 1 − shelterFactor
```

`shelterFactor` (0–1) is set per outside zone: 0 = fully open air, 1 = fully enclosed courtyard.

**Cross-ventilation boost:**

```
boost = 1.6   if the room has ≥ 2 open exterior openings
boost = 1.0   otherwise
```

The 1.6× multiplier approximates the empirical observation that cross-flow ventilation (openings on opposite sides) is roughly 60% more effective than single-sided ventilation.

### 4.2 Heat transfer

```
Q_vent = ρ_air · cp_air · V̇ · (T_b − T_a)     [W]
```

The same formula applies whether the opening connects to an outside zone or to another room.

### 4.3 Box fan (forced ventilation)

When an active box fan targets an open opening, the natural `V̇` is replaced by the fan's fixed flow rate:

```
V̇_forced = fan.flowRateM3S      (typical: 0.09 m³/s ≈ 324 m³/h)
```

The cross-ventilation boost does **not** apply in forced mode.

---

## 5. Solar Heat Gain

### 5.1 Sun position (simplified model)

**Azimuth** (degrees clockwise from north):

```
Az_sun = 90 + (hour − 6) × 15
```

This is a linear east → south → west sweep: 90° at 6 am, 180° at noon, 270° at 6 pm.

**Elevation** (degrees above horizon):

```
elev = 60° × sin(π × progress)
progress = (hour − 6) / 12      (0 at 6 am, 1 at 6 pm)
elev = 0 outside [6 am, 6 pm]
```

The 60° peak corresponds to mid-latitude summer noon (approximately 48°N at summer solstice).

### 5.2 Wall outward normal

For each exterior wall, the outward normal is computed from the wall direction vector, then flipped to point away from the room centroid. It is then converted from canvas coordinates (Y-down, arbitrary rotation) to geographic azimuth (clockwise from north) using the project's `northAngle` offset:

```
N_north = nx · sin(northAngle) + ny · (−cos(northAngle))
N_east  = nx · cos(northAngle) + ny ·   sin(northAngle)
Az_wall_normal = atan2(N_east, N_north)  [degrees CW from north]
```

### 5.3 Irradiance on a vertical surface

```
I_wall = I_direct × max(0, cos(elev) × cos(Az_sun − Az_wall_normal))     [W/m²]
I_direct = 800 W/m²   (peak direct normal irradiance, clear summer day)
```

Only positive values are used (the wall must face the sun).

### 5.4 Heat gain through opaque wall fabric (sol-air model)

```
Q_solar_wall = α · I_wall · A_solid · f_in     [W]

f_in = R_int_film / R_total = 0.13 / (R_fabric + 0.17)
```

- `α` = solar absorptance of the wall material (0.55–0.75 depending on construction)
- `f_in` = fraction of the absorbed solar energy that flows inward (rather than re-radiating outward). Derived from the internal/total thermal resistance ratio.

### 5.5 Heat gain through glazing

```
Q_solar_glazing = SHGC · I_wall · A_opening     [W]
```

SHGC (Solar Heat Gain Coefficient) is the fraction of incident solar radiation that passes directly into the room through the glazing:

| Glazing type | SHGC |
|---|---|
| Single | 0.86 |
| Double | 0.70 |
| Low-E double | 0.40 |
| Triple | 0.35 |

---

## 6. Portable Air Conditioning

A portable AC removes heat at a constant rate when active:

```
Q_AC = −P_cooling     [W, negative = room loses heat]
```

Typical values: 1 000 W (small), 2 000 W (medium), 3 500 W (large). The model treats the unit as a perfect heat sink with no waste-heat leakage back into the room.

---

## 7. Housing Type Effects

### 7.1 Roof coupling (top-floor and house)

The roof surface receives solar radiation and conducts heat with the outside air.

**Horizontal irradiance** (roof faces up):

```
I_horiz = I_direct × sin(elev_rad)     [W/m²]
```

**Roof heat gain:**

```
Q_roof = α_roof · I_horiz · A_floor · f_in_roof
       + U_roof · A_floor · (T_outside − T_room)     [W]
```

| Parameter | Uninsulated | Insulated |
|---|---|---|
| U\_roof | 1.5 W/(m²·K) | 0.35 W/(m²·K) |
| α\_roof | 0.75 (dark tile/felt) | 0.75 |

```
f_in_roof = R_int_film / (R_roof + R_surface_films)
          = 0.13 / (1/U_roof + 0.17)
```

### 7.2 Ground-floor slab coupling (ground-floor and house)

The floor slab exchanges heat with the ground at a near-constant deep temperature:

```
Q_floor = U_slab · A_floor · (T_ground − T_room)     [W]

T_ground = 17 °C   (typical deep-ground temperature, temperate climate)
U_slab   = 0.5 W/(m²·K)
```

This term is negative (cooling) when the room is warmer than 17 °C, which is the common summer case — the ground acts as a heat sink.

---

## 8. Ceiling/Standing Fan Comfort Offset

Ceiling and standing fans do **not** change the air temperature; they improve perceived comfort through evaporative cooling and increased convection. The model captures this by raising the effective comfort threshold used for scoring:

```
T_comfort_eff,i = T_comfort + Σ offset_k     (capped at T_comfort + 3 °C)
```

| Fan type | Comfort offset |
|---|---|
| Ceiling fan | +2.0 °C |
| Standing fan | +1.5 °C |

---

## 9. Numerical Integration

The system of ODEs is integrated using **adaptive explicit Euler**:

```
T_i(t + dt) = T_i(t) + dt · Q_net,i / C_i
```

**Stability constraint** (CFL-like condition):

```
dt ≤ 0.4 · min_i( C_i / G_sum,i )
```

where `G_sum,i` is the sum of all conductances (W/K) connected to room *i*, including both solid and ventilation edges. The 0.4 factor provides a safety margin below the exact stability limit of 0.5.

The step is also bounded:
- **Upper bound**: next output frame boundary (≤ 6 min of simulated time)
- **Lower bound**: 0.01 s (prevents infinite loops near equilibrium)

Output frames are recorded at intervals of `min(0.1 h, simHours / 200)`, producing at least 200 frames per simulation and at most one frame every 6 minutes.

---

## 10. Cooling Score

The output metric is **degree-hours above the comfort threshold**, integrated by the trapezoidal rule:

```
DH_i = ∫ max(0, T_i(t) − T_comfort_eff,i) dt     [°C·h]

DH_i ≈ Σ_{f=1}^{N} [ (e_{f−1} + e_f) / 2 ] · Δt_f

e_f = max(0, T_i[f] − T_comfort_eff,i)
```

The project-level score is the average across all rooms:

```
DH = (1/n) · Σ_i DH_i
```

Lower values indicate better thermal comfort. A score of 0 means no room was ever above the comfort threshold during the simulation.

---

## 11. Outdoor Temperature Profile

Each outside zone can have a constant temperature or a sinusoidal daily profile:

```
T_zone(hour) = T_mid + T_amp · cos( 2π · (hour − peakHour) / 24 )

T_mid = (T_max + T_min) / 2
T_amp = (T_max − T_min) / 2
```

The cosine formula peaks at `peakHour` and troughs 12 hours later.

---

## 12. Constants Summary

| Constant | Value | Unit | Source |
|---|---|---|---|
| ρ\_air | 1.2 | kg/m³ | Standard air at 20 °C |
| cp\_air | 1005 | J/(kg·K) | Standard air |
| g | 9.81 | m/s² | Gravity |
| R\_surface\_films | 0.17 | m²·K/W | ISO 6946 (0.13 int + 0.04 ext) |
| I\_direct | 800 | W/m² | Clear-sky summer DNI |
| Peak sun elevation | 60 | ° | Mid-latitude summer noon |
| Base breeze speed | 0.12 | m/s | Typical low-wind ambient |
| Cross-vent boost | 1.6 | — | Empirical (CIBSE Guide A) |
| Ground temperature | 17 | °C | Temperate deep-ground |
| U\_floor slab | 0.5 | W/(m²·K) | Concrete slab-on-grade |
| U\_roof (uninsulated) | 1.5 | W/(m²·K) | Flat roof / old tiles |
| U\_roof (insulated) | 0.35 | W/(m²·K) | Modern insulated roof |
| α\_roof | 0.75 | — | Dark tile / felt surface |
| Fan comfort offset (ceiling) | 2.0 | °C | ASHRAE 55 / ISO 7730 |
| Fan comfort offset (standing) | 1.5 | °C | ASHRAE 55 / ISO 7730 |

---

## 13. Limitations

- **Well-mixed assumption**: each room has one temperature; no spatial gradients, stratification, or local comfort zones.
- **Simplified solar geometry**: linear azimuth sweep, sinusoidal elevation, no latitude/longitude, no equation of time, no diffuse sky radiation.
- **No latent heat**: humidity and evaporative cooling of the air mass are not modelled (only sensible heat).
- **No ground floor for interior floors**: only the bottom-most slab is coupled to the ground; inter-floor conduction between stacked apartments is not modelled.
- **No inter-room radiation**: radiative heat exchange between room surfaces is not included.
- **Portable AC exhaust**: the waste heat exhausted by the AC compressor is assumed to go fully outside; in reality a poorly-sealed exhaust hose can leak heat back into the room.
- **Steady-state equipment**: fans and ACs are modelled as always-on during the simulation; no thermostat or schedule logic.
