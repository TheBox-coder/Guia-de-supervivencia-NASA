# JEZERO 4.0.0-p0 — Mission Control

Home consolidates the current route, hypothetical O₂/battery and declared water/CO₂/thermal budgets. Missing inputs remain unknown. Use Area on narrow screens, × to close and ↑ to reopen. Existing saved module preference is retained.

Prepare mission opens the existing planner. Review contingencies opens the current documented protocol editor. Scientific Assurance & Validation expands the inspected equations, versions, tests and limitations. No physical certification is claimed. Export evidence produces JEZERO-ASSURANCE v1 with inputs and a recalculated snapshot; it is not a mission restore or Survival Twin replay. Keep the original mission and support JSON exports too.

This increment preserves all previous data keys. Deleting saved records, clearing/replacing a mission and removing weather now require confirmation. Starting another mission preserves the previous recoverable draft until a new draft replaces it or you explicitly dismiss it. Offline the cached shell and stored inputs remain available; new remote imagery, elevation and server PDF are not guaranteed. Survival Twin, Academy and the new Emergency Center remain future increments. See docs/ESTADO-JEZERO-4.md for actual phase status.

> V50: click a navigation button to open its interface, then click again to close it. Weather projects next-sol temperature from imported observations with an hour selector. Pressure and wind are observed data. It does not predict storms or automatically retrieve current telemetry.

# JEZERO · Help manual

Version 49. Open Help or press ? outside a text field. The tutorial preserves your progress without modifying mission data.

## Getting started

JEZERO combines three tasks: planning a route, adding weather observations and estimating resources for the return journey.

- In **Mission**, define a base and at least one destination.

- Calculate the route and review its alternatives.

- In **Guide**, import observations and confirm your equipment capacities.

- Read the alerts and save the assessment.

Valid weather files remain in this browser. Use the mission library or export mission JSON to retain your points and parameters. A draft can be recovered after reloading.

## Create and calculate a mission

Open **Mission**. Your first point is the base. Enter latitude and longitude or select a location on the map, then add your destinations.

Give points useful names and stop times. Set the available duration, speed and terrain limits. Keep **Return to base** enabled when you want the return included in the budget.

The alternatives prioritize distance, balance or lower topographic exposure. A shorter route does not guarantee longer autonomy. Elevation calculations require the external service; a failure does not generate fictional terrain.

Latitude: −90 to 90°. Longitude: −180 to 180°. Zero is valid. Convert 0–360° longitudes before importing.

## Import weather observations

In **Guide → Your observations**, import normalized JSON or CSV. The downloadable CSV template contains headers only: fill it with your measurements.

```csv
sol,localHour,temperatureC,pressurePa,windMps
```

- **sol:** integer Martian day in your dataset.

- **localHour:** local hour from 0 to less than 24.

- **temperatureC:** temperature in °C, required.

- **pressurePa:** pressure in Pa, optional.

- **windMps:** wind in m/s, optional.

For CSV, declare the source and measurement coordinates. Import 12–5000 samples with no duplicate timestamps. At least 12 samples from the latest three sols must cover six distinct three-hour bands. File limit: 5 MB.

The projection fits a daily temperature pattern; it does not predict storms or verify authenticity or freshness. Pressure and wind are observations, not forecasts. Data from a distant location can trigger a warning.

## Configure oxygen and battery

In **Guide → Resources for the return**, open the equipment settings. Review crew size, reserve, available oxygen, consumption rate, battery capacity and base power load.

Capacities and results are **per person**. Initial values are editable assumptions: replace them with documented equipment parameters.

Confirm only after reviewing. Changing capacity or consumption clears confirmation. Invalid values block assessment export.

The model estimates consumption and thermal demand. Its coefficients are not calibrated to certify an actual suit or life-support system.

## Understand results and alerts

**Time reserve** is available time minus estimated mission duration. A negative value means the route exceeds the window.

- **Replan:** a time, oxygen or energy reserve is exceeded.

- **Review:** a condition or assumption needs attention.

- **Missing data:** information such as radiation or communications is unavailable.

- **Reserves maintained:** the model retains resources under the declared parameters; it does not certify safety.

Open **Technical details and scenarios** to compare routes, explore consumption or test dust and battery-failure assumptions. These are planning hypotheses, not measured conditions.

The budget summary reports reserve surplus or deficit for each resource. Use the limiting resource to decide which assumption to review, then recalculate.

## Terrain and soil analysis

The digital elevation model (DEM) estimates slope, roughness and sampling-grid spacing. Sampling quality describes the calculation, not a probability of survival.

The reference grid is approximately 200 m and cannot identify person-scale obstacles. It does not establish chemical composition, toxicity, bearing capacity or usable water.

Firm or loose ground is a user assumption, not an instrument classification. Detailed CTX and HiRISE imagery is available around Jezero where coverage and services permit; it does not change the planning DEM resolution.

## Save, recover and work offline

**Mission library:** open **My missions** to save, duplicate, reopen or delete local plans. Opening a copy restores inputs; routes must be recalculated. Up to 20 copies are kept in this browser.

**Draft:** valid mission inputs are saved locally after editing. Use the recovery banner after a reload. Starting or clearing a mission removes the draft.

**Mission JSON:** export your points and parameters with **Save mission**; restore them with **Open mission**. Keep an exported copy outside the browser.

**Assessment JSON:** complete route, observations and equipment confirmation, then save the resource assessment with its sources and assumptions.

**PDF report:** requires the server.

The interface and help can reopen offline after a complete first load. External imagery and terrain calculations need connection. Missing data is not replaced by invented measurements. Clearing browser storage removes local observations, drafts and saved missions.

## Troubleshooting

### I cannot save an assessment
Check all three steps: calculated route, valid observations and confirmed equipment. Correct empty or out-of-range fields.

### The map or calculation is not responding
Check connection and wait for the elevation service. Try a smaller region and distinct base and destination points. An external outage does not activate synthetic terrain.

### The map looks blurry
Global Viking imagery has limited detail. Use the Jezero detail control to load regional CTX/HiRISE mosaics. Coverage has gaps and needs connection. The badge shows the imagery source or its loading status; image detail does not improve the planning DEM.

### My file will not import
Read the error message. Check format, units, declared source, coordinates, duplicates and temporal coverage. CSV uses decimal points and commas between columns. An invalid import retains the previous valid file.

### Results change when I edit
Parameters change the calculation. Editing points or constraints invalidates the route; changing equipment capacities requires confirmation again.

### I see an older version
Reload after updating the project. The cache updates when the server publishes the new version. Export your files before clearing browser storage.

## Glossary and scope

**EVA**: Activity outside a vehicle or habitat. JEZERO uses it as the available window to travel, work and return.

**Sol**: A Martian day, used to identify observations.

**DEM**: Digital elevation model: a numerical terrain representation.

**Reserve**: Time or resources required to remain unused.

**kWh and kW**: kWh measures battery energy; kW measures power or rate of energy consumption.

**Declared provenance**: A source supplied by the file author; not automatically verified.

JEZERO is a planning tool with explainable models. It has no automatic link to current NASA telemetry and does not replace mission protocols.


## Survival planning center · V51

Open **Support** or use the Guide button. Save forms with **Save inputs** or **Save record**. Data is local and operator-declared.

- **Shelters:** coordinates, capacity, availability, resources and source. Select a mission reference location. View map shows assets; Add as destination lets the existing route engine calculate the journey. Straight distance does not establish traversability or actual availability.
- **Life support:** water in L and L/h; CO₂ removal capacity in kg and generation in kg/h; thermal energy in kWh and load in kW. All per person. Budgets use current calculated route or matching scenario duration. Thermal energy is not added again to the Guide battery. Air CO₂ concentration is not modeled.
- **Radiation:** µSv/h rate, accumulated mSv, source and ISO timestamp with a zone. Projection assumes a constant rate. Mission limits are supplied by your team, not medical recommendations from the app. Missing, future or overly old readings remain pending.
- **Communications:** checked link state, contacts and backup channels. Relays have coordinates and declared radius. Circles do not validate propagation, terrain, interference or real coverage.
- **Equipment:** suit, rover, habitat, radio and dosimeter inventory; state, criticality, checks and maintenance. Checked state is not an automatic inspection.
- **Contingencies:** record documented team protocols with source, responsible person and steps. Event categories include power failure, pressure loss, injury, link loss and blocked routes. The app does not generate certified medical treatments or procedures. Checkboxes record operator-declared steps in the log.
- **Abort criteria:** maximum duration, minimum water, dose, slope, measurement age, mandatory return, link loss and critical faults. Causes are displayed separately; missing data is never a pass. Negative resource budgets are also flagged.
- **Logbook:** notes, decisions, incidents and changes with UTC timestamps. This is an editable local journal, not an immutable forensic record.

**Save pack** exports JEZERO-SUPPORT v1 with state, log, assessment and mission reference. **Open pack** validates before replacing support inputs and does not replace the route. Also save mission JSON. Import limit: 10 MB; 40 inventory records, 50 protocol steps and 500 log entries. Export and remove an entry to free log space. Clearing browser storage removes local copies.

Measurement timestamps include a zone, for example `2026-10-12T14:00:00Z`; this is a format example, not a configured reading. Maintenance dates use UTC `YYYY-MM-DD`. The interface and records work offline after a complete first load; external imagery and elevation calculations require connection. No status authorizes departure or certifies safety.
