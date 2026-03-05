# Montgomery ArcGIS — API Reference

> **Last verified against live API:** 2026-03-05
>
> **Base URL:** `https://gis.montgomeryal.gov/server/rest/services`
>
> **Auth:** None. All endpoints are public. No API key required.

---

## Quick Reference

**Query pattern (GeoJSON):**

```
{BASE_URL}/{path}/query?where=1%3D1&outFields=*&outSR=4326&f=geojson
```

**Pagination:** Default max return is 2000 features. Use `resultRecordCount=N` and `resultOffset=N` for larger datasets.

**Fetch a single record (for testing):**

```
{BASE_URL}/{path}/query?where=1%3D1&outFields=*&outSR=4326&f=geojson&resultRecordCount=1
```

### For AI Agents

When an agent needs to query this data:
1. Build the URL using the path from the tables below
2. Use `where` clauses for filtering (e.g., `where=TYPE_FACIL='Hospital'`)
3. Coordinates are `[longitude, latitude]` in GeoJSON geometry arrays
4. All string fields are UPPER CASE in the database
5. Field names are the **exact** column names below — not human-readable labels

### For Developers

When writing integration code:
1. Field names are often truncated to 10 characters (Shapefile legacy)
2. Case sensitivity varies across layers (`Name` vs `NAME` vs `BRANCH_NAME`)
3. Filter out system fields: `OBJECTID`, `OBJECTID_1`, `GlobalID`, `created_user`, `created_date`, `last_edited_user`, `last_edited_date`
4. Shape field naming is inconsistent across layers — see [Gotchas](#known-gotchas)

---

## 1. HostedDatasets — Integrated (6 Layers)

These are currently consumed by the navigator frontend via `arcgisService.ts`.

### 1.1 Health Care Facilities

```
Path:     HostedDatasets/Health_Care_Facility/FeatureServer/0
Geometry: Point
Records:  36
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `COMPANY_NA` | string | `"BAPTIST MEDICAL CENTER EAST"` | Facility name (truncated from COMPANY_NAME) |
| `ADDRESS` | string | `"400 TAYLOR RD"` | Physical address |
| `PHONE` | string | `"(334) 244-8100"` | Contact phone |
| `TYPE_FACIL` | string | `"Hospital"` / `"Clinic"` / `"Rehab"` | Facility type — use for filtering |
| `BEDS_UNITS` | number | `150` | Bed/unit count — proxy for capacity |
| `EMPLOY` | number | `1200` | Employee count |

**Agent use:** Find nearest hospital/clinic/rehab. Filter by `TYPE_FACIL`. Use `BEDS_UNITS` to estimate capacity. Cross-reference with Medicaid eligibility data.

---

### 1.2 Community Centers

```
Path:     HostedDatasets/Community_Centers/FeatureServer/0
Geometry: Point
Records:  23
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `FACILITY_N` | string | `"CRAMTON BOWL COMMUNITY CENTER"` | Facility name (truncated) |
| `ADDRESS` | string | `"611 MADISON AVE"` | Physical address |
| `TYPE` | string | — | Center type |
| `ZIP` | string | — | Zip code |

**Agent use:** Connect job-seekers to workforce programs, GED prep, after-school programs. Cross-reference with childcare for parent accessibility.

---

### 1.3 Daycare Centers

```
Path:     HostedDatasets/Daycare_Centers/FeatureServer/0
Geometry: Point
Records:  178
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `Name` | string | `"ABC LEARNING CENTER"` | Facility name |
| `Address` | string | `"123 MAIN ST"` | Physical address |
| `Phone` | string | `"(334) 555-0100"` | Contact phone |
| `Director` | string | — | Director name |
| `Day_Hours` | string | `"6:30AM-6:00PM"` | Daytime operating hours |
| `Day_Ages` | string | `"6wks-12yrs"` | Ages accepted (day) |
| `Night_Hour` | string | `"6:00PM-11:00PM"` | Night operating hours |
| `Night_Ages` | string | `"2yrs-12yrs"` | Ages accepted (night) |
| `F13` | number | `45` | Capacity field 1 |
| `F14` | number | `60` | Capacity field 2 |
| `Status_1` | string | `"Active"` | Operating status (also duplicated as `Status1`) |
| `Notes` | string | — | Free text notes |

> **GOTCHA:** The field is `Night_Hour` (no trailing 's'), not `Night_Hours`.

**Agent use:** Match parents to daycares by age range and hours. Night hours are critical for military/shift workers near Maxwell AFB. Capacity fields (`F13`/`F14`) indicate availability likelihood.

---

### 1.4 Education Facilities

```
Path:     HostedDatasets/Education_Facilities/FeatureServer/0
Geometry: Point
Records:  90
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `NAME` | string | `"BELLINGRATH MIDDLE SCHOOL"` | School name |
| `Address` | string | `"3025 MOBILE HWY"` | Physical address |
| `TELEPHONE` | string | `"(334) 269-3680"` | Contact phone |
| `Level_` | string | — | School level (Elementary/Middle/High) — note trailing underscore |
| `TYPE` | string | — | Public/Private |
| `Enroll` | number | — | Enrollment count (also: `ENRLMT`, `SCH_ENRL`, `enr` — multiple enrollment fields exist) |
| `EMPLOY` | number | — | Employee count |

> **GOTCHA:** The level field is `Level_` with a trailing underscore. Four different enrollment fields exist — prefer `Enroll`.

**Agent use:** Connect families to school zones. Cross-reference with childcare for after-school coverage gaps.

---

### 1.5 Fire Stations

```
Path:     HostedDatasets/Fire_Stations/FeatureServer/0
Geometry: Point
Records:  15
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `Name` | string | `"FIRE STATION 1"` | Station name |
| `Address` | string | `"200 COOSA ST"` | Physical address |

**Agent use:** Emergency response coverage analysis. Which neighborhoods are >5 min from a station?

---

### 1.6 Libraries

```
Path:     HostedDatasets/Libraries/FeatureServer/0
Geometry: Point
Records:  12
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `BRANCH_NAME` | string | `"ROSA PARKS MUSEUM BRANCH"` | Branch name |
| `ADDRESS` | string | `"252 MONTGOMERY ST"` | Physical address |

**Agent use:** Free computer/internet access, job search assistance, GED programs. Critical for digital divide — direct residents without internet to nearest library.

---

## 2. HostedDatasets — Not Yet Integrated (9 Layers)

These are verified working but not yet consumed by the frontend.

### 2.1 Business Licenses

```
Path:     HostedDatasets/Business_License/FeatureServer/0
Geometry: Point
Records:  122,726
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `custCOMPANY_NAME` | string | `"ACCESS NEW TECHNOLOGY SOLUTIONS"` | Company name |
| `custDBA` | string | `"ACCESS NEW TECHNOLOGY SOLUTIONS"` | DBA / trade name |
| `Full_Address` | string | `"3110 KNIGHTSBRIDGE CURV"` | Physical address |
| `addrCITY_PHYSICAL` | string | `"MONTGOMERY"` | City |
| `addrZIP_PHYSICAL` | number | `361111206` | Zip — stored as integer, needs parsing |
| `scCODE` | string | `"541600"` | SIC code |
| `scNAME` | string | `"CONSULTANT"` | SIC category name |
| `pvscDESC` | string | `"CONSULTANT"` | SIC description |
| `pvrtDESC` | string | `"Renew"` / `"New"` | Permit type (new vs renewal) |
| `pvYEAR` | number | `2021` | License year |
| `pvEFFDATE` | string | `"2021-01-01"` | Effective date |
| `pvEXPIRE` | string | `"2021-12-31"` | Expiration date |
| `CITY` | string | `"YES"` | Within city limits flag |

> **GOTCHA:** All field names use opaque prefixes (`cust`, `pv`, `addr`, `sc`). The zip field is an integer — `361111206` means `36111-1206`. Parse as string and split at position 5.

**Agent use:** Every licensed business in Montgomery with industry classification. Answer "What businesses are hiring near me?" by SIC code. Track business formation trends (new vs renewals). Cross-reference with workforce training to match job seekers to local employers.

---

### 2.2 Construction Permits

```
Path:     HostedDatasets/Construction_Permits/FeatureServer/0
Geometry: Point
Records:  43,242
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `PermitNo` | string | `"BD250476"` | Permit number |
| `PhysicalAddress` | string | `"10510 CHANTILLY PKWY MONTGOMERY AL 36117"` | Full site address |
| `PermitStatus` | string | `"ISSUED"` | Current status |
| `PermitCode` | string | `"B105"` | Permit category code |
| `PermitDescription` | string | `"Five or More Family Apartments - Master Permit"` | Permit type text |
| `ProjectType` | string | `"New"` / `"Renovation"` | New build vs renovation |
| `UseType` | string | `"Commercial"` / `"Residential"` | Use classification |
| `EstimatedCost` | number | `17625000` | Estimated cost in dollars |
| `JobDescription` | string | `"ERECT A NEW MULTI-FAMILY COMPLEX..."` | Full description (long text) |
| `OwnerName` | string | — | Property owner |
| `ContractorName` | string | — | Contractor |
| `Zoning` | string | `"R-65-M"` | Zoning district |
| `FloodZone` | string | `"AE / 0232 - H"` | FEMA flood zone |
| `DistrictCouncil` | number | `9` | Council district number |
| `Year` | string | `"2025"` | Permit year |
| `Month` | string | `"3"` | Permit month |
| `IssuedDate` | string | `"2025-03-10"` | Issue date |
| `Building_Fee` | number | — | Building fee |
| `Total_Fee` | number | — | Total fees |

**Agent use:** Where is Montgomery growing? Development heatmaps by district. Cross-reference with schools/daycare for "will services keep up with growth?"

---

### 2.3 Code Violations

```
Path:     HostedDatasets/Code_Violations/FeatureServer/0
Geometry: Point
Records:  78,716
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `OffenceNum` | string | `"C00127179"` | Case number (British spelling) |
| `CaseDate` | string | `"2021-10-27"` | Date filed |
| `CaseType` | string | `"NUISANCE"` | Violation category |
| `CaseStatus` | string | — | Current status |
| `LienStatus` | string | `"Lien Filed"` | Lien info |
| `CouncilDistrict` | string | `"DISTRICT 4"` | Council district (string, not integer) |
| `Address1` | string | — | Location (frequently null) |
| `ParcelNo` | string | — | Parcel number (use as geocoding fallback when Address1 is null) |
| `Year` | string | `"2021"` | Year |
| `Month` | string | `"10"` | Month |

> **GOTCHA:** Field is `OffenceNum` (British spelling "offence"), while Nuisance Reports use `OffenseNo` (American spelling). `Address1` is frequently null — use `ParcelNo` for geocoding fallback.

**Agent use:** Neighborhood quality signal. High violation density = declining area. Cross-reference with 311 requests for compound problem areas.

---

### 2.4 311 Service Requests

```
Path:     HostedDatasets/Received_311_Service_Request/FeatureServer/0
Geometry: Point
Records:  207,127
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `Request_ID` | number | `317646` | Request ID |
| `Create_Date` | number | `1609459560000` | Created (epoch milliseconds) |
| `Close_Date` | number | `1643834160000` | Closed (epoch ms, null if open) |
| `Department` | string | `"Street Maintenance"` | Responsible department |
| `Request_Type` | string | `"Drains"` | Request category |
| `Address` | string | `"WARES FERRY RD"` | Location |
| `District` | number | `1` | Council district (integer) |
| `Status` | string | `"Closed"` / `"Open"` | Current status |
| `Origin` | string | `"Website"` / `"Phone"` / `"App"` | How submitted |
| `Latitude` | number | `32.387676` | Latitude (also in geometry) |
| `Longitude` | number | `-86.232888` | Longitude (also in geometry) |
| `Year` | number | `2021` | Year |

> **GOTCHA:** Dates are epoch milliseconds. Divide by 1000 for Unix timestamp. `Create_Date / 1000` → standard Unix time.

**Agent use:** Resident satisfaction and infrastructure health. What are people complaining about and where? Cross-reference with code violations for compound problem areas. City leaders get department workload and seasonal patterns.

---

### 2.5 Police Facilities

```
Path:     HostedDatasets/Police_Facilities/FeatureServer/0
Geometry: Point
Records:  18
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `Facility_Name` | string | `"Public Affairs Building-Police Headquarters"` | Facility name |
| `Facility_Address` | string | `"320 North Ripley St"` | Physical address |

**Agent use:** Public safety infrastructure. Combined with fire stations for complete safety coverage map.

---

### 2.6 Nuisance Reports

```
Path:     HostedDatasets/Nuisance/FeatureServer/0
Geometry: Point
Records:  6,102
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `OffenseNo` | string | `"C00172467"` | Case number (American spelling) |
| `Location` | string | `"3109 GENTILLY CT"` | Address |
| `Remark` | string | `"Junk Vehicles, Litter, Junk, Trash, Overgrown Grass..."` | Free text description |
| `Type` | string | `"NUISANCE"` | Report type |
| `Date` | number | `1736208000000` | Date (epoch milliseconds) |
| `District` | string | `"6"` | Council district (string) |
| `HearingDate` | string | `"2025/01/07"` | Hearing date |

**Agent use:** Detailed quality-of-life issues. The `Remark` field is free text — useful for AI summarization of neighborhood conditions.

---

### 2.7 Tornado Sirens

```
Path:     HostedDatasets/Tornado_Sirens/FeatureServer/0
Geometry: Point
Records:  76
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `Brand` | string | `"Whelen"` | Siren brand |
| `Location_A` | string | `"375 Hunter Loop Rd (Asphalt Paving Company)"` | Location description (truncated) |
| `Date_Insta` | number | `859939200000` | Install date (epoch ms, truncated) |
| `Average_Es` | number | `0.98` | Average coverage estimate (truncated) |
| `Worst_Est_` | number | `0.98` | Worst-case coverage (truncated) |
| `Lat` | number | `-86.387` | **WARNING: Contains longitude, not latitude** |
| `Long` | number | `32.353` | **WARNING: Contains latitude, not longitude** |

> **GOTCHA:** `Lat` and `Long` field names are **swapped** in the data. `Lat` contains longitude, `Long` contains latitude. Always use the GeoJSON geometry coordinates instead.

**Agent use:** Emergency preparedness mapping. Coverage gap analysis for warning systems.

---

### 2.8 City-Owned Properties

```
Path:     HostedDatasets/City_Owned_Properities/FeatureServer/0
Geometry: Polygon (NOT Point)
Records:  597
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `OWNER1_1` | string | `"CITY OF MONTGOMERY"` | Owner |
| `PROP_ADDRE` | string | `"HWY 80"` | Property address (truncated) |
| `STREET_NAM` | string | `"HWY 80"` | Street name (truncated) |
| `NBHD` | string | `"THE ORCHARDS"` | Neighborhood |
| `ZONING` | string | `"O-2"` | Zoning code |
| `APPRAISED_` | number | `250000` | Appraised value in dollars (truncated) |
| `CALC_ACRE` | number | `8.57` | Acreage |
| `Use_` | string | — | Use type |
| `Maint_By` | string | `"VACANT LOT CREW"` | Maintenance crew |
| `NOTES` | string | `"DONATED FOR PARK; USACE REQUIRES WETLAND"` | Notes (free text) |
| `LOCATION` | string | `"Pond/woods NE of Alsbury Pl in Towne Lake"` | Location description |

> **GOTCHA:** Geometry is **Polygon**, not Point — despite being in the HostedDatasets folder. Compute centroid for map markers. Also note the typo in the URL path: `Properities` (not `Properties`).

**Agent use:** Municipal asset inventory. Potential sites for new services. Cross-reference with service gaps to propose new facility locations.

---

### 2.9 Paving Projects

```
Path:     HostedDatasets/Paving_Project/FeatureServer/0
Geometry: Polyline (LineString)
Records:  960
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `FULLNAME` | string | `"9TH ST"` | Street name |
| `From_` | string | `"N Court St"` | From cross street |
| `To_` | string | `"Cross St"` | To cross street |
| `DistrictCode` | number | `3` | Council district (integer) |
| `DistrictDesc` | string | `"District 3"` | District name |
| `Status` | string | `"Completed"` / `"In Progress"` | Project status |
| `Year` | string | `"2020"` | Project year |
| `CompletionDate` | number | `1598918400000` | Completed (epoch ms) |
| `AsphaltEst` | number | `20133.12` | Asphalt cost estimate in dollars |
| `EstTons` | number | `280` | Estimated tonnage |
| `Width_ft` | number | `24` | Road width in feet |
| `Length_Miles` | number | `0.227` | Segment length in miles |
| `RB_Rating` | number | `3` | Road condition rating |
| `Contractor` | string | — | Contractor name |

> **GOTCHA:** Geometry is **Polyline** (road segments), not Point. These are line features.

**Agent use:** Infrastructure investment tracking. Active road projects, completion status. Helps residents understand construction impact.

---

## 3. Boundary & Context Layers (Polygon/Polyline)

These are polygon/line layers representing areas, districts, and infrastructure boundaries. Useful as **context overlays** for spatial queries.

### 3.1 Military Bases

```
Path:     Streets_and_POI/FeatureServer/10
Alt path: OneView/Military_Bases/MapServer/10
Geometry: Polygon
Records:  ~2
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `Id` | number | `0` | Identifier |

> **GOTCHA:** No name field. Maxwell AFB and Gunter Annex are identified by geometry location only. The MapServer alt path returns `Shape.STArea()` (dot notation) instead of `Shape__Area` — requires special handling.

**Agent use:** Maxwell AFB and Gunter Annex boundaries. Overlay with childcare/schools for military family support mapping. These are Montgomery's largest employers.

---

### 3.2 Universities

```
Path:     Streets_and_POI/FeatureServer/11
Geometry: Polygon
Records:  ~5
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `Name` | string | `"Auburn University Montgomery"` | University name |

**Agent use:** ASU, AUM, Faulkner, Troy-Montgomery, Huntingdon. Workforce development hubs.

---

### 3.3 City Parks

```
Path:     Streets_and_POI/FeatureServer/7
Geometry: Polygon
Records:  varies
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `FACILITYID` | string | `"GATEWAY PARK"` | Park name |
| `FULLADDR` | string | `"2801 EASTERN BLVD"` | Address |
| `OPERDAYS` | string | `"DAILY"` | Operating days |
| `OPERHOURS` | string | `"6AM-9PM"` | Operating hours |
| `PARKURL` | string | — | Website URL |
| `PARKAREA` | number | — | Park area |
| `NUMPARKING` | number | — | Parking spaces |
| `RESTROOM` | string | — | Restroom availability |
| `ADACOMPLY` | string | — | ADA compliance |
| `SWIMMING` | string | — | Swimming available |
| `HIKING` | string | — | Hiking trails |
| `FISHING` | string | — | Fishing available |
| `PICNIC` | string | — | Picnic areas |
| `PLAYGROUND` | string | — | Playground available |
| `BASKETBALL` | string | — | Basketball courts |
| `TENNIS` | string | — | Tennis courts |
| `SOCCER` | string | — | Soccer fields |
| `BASEBALL` | string | — | Baseball fields |
| `SKATEBOARD` | string | — | Skateboard facilities |
| `GOLF` | string | — | Golf facilities |

**Agent use:** Quality of life mapping with 20+ amenity flags. Direct families to parks by activity type. Cross-reference with community centers (many share locations).

---

### 3.4 Historic Areas

```
Properties: OneView/Historic_Areas/FeatureServer/1
Districts:  OneView/Historic_Areas/FeatureServer/2
Geometry:   Polygon
```

**Layer 1 (Properties):**

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `DISTRICT` | string | `"CP HGT-ST CH"` | Historic district name |

**Layer 2 (Districts):**

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `FE_NAME` | string | `"Capitol Heights-St. Charles"` | District name |
| `FE_TYPE` | string | `"District"` | Feature type |
| `Ordinance` | string | — | Establishing ordinance |
| `Ord_Date` | string | — | Ordinance date |

**Agent use:** Montgomery's civil rights heritage context. "This neighborhood is part of the XYZ historic district."

---

### 3.5 City Council Districts

```
Path:     OneView/City_Council_District/FeatureServer/3
Geometry: MultiPolygon
Records:  9
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `Name` | string | `"ED GRIMES"` | Council member name |
| `District` | string | `"District 1"` | District label |
| `Phone` | string | `"(334) 544-0248"` | Council member phone |
| `Address` | string | `"P.O. BOX 1111"` | Council member address |
| `Email` | string | `"egrimes@montgomeryal.gov"` | Council member email |
| `ImageLink` | string | — | Photo URL |

> **GOTCHA:** Layer ID is **3**, not 0.

**Agent use:** Tell residents their council rep, direct contact info, and district number. All violation/permit data includes district — enables per-district analytics.

---

### 3.6 Flood Hazard Areas

```
Path:     OneView/Flood_Hazard_Areas/FeatureServer/0
Geometry: Polygon
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `FLD_ZONE` | string | `"A"` / `"AE"` / `"X"` | FEMA flood zone code |
| `FLOODWAY` | string | — | Floodway designation |
| `SFHA_TF` | string | `"T"` | Special Flood Hazard Area (T=true, F=false) |
| `STATIC_BFE` | number | — | Base Flood Elevation |
| `DEPTH` | number | — | Flood depth |
| `VELOCITY` | number | — | Flow velocity |
| `ZONE_SUBTY` | string | — | Zone subtype |

> **GOTCHA:** Many numeric fields use `-9999` as a null placeholder.

**Agent use:** Warn residents about flood risk when considering relocation. Cross-reference with construction permits for risk-aware development tracking.

---

### 3.7 Entertainment Districts

```
Path:     OneView/Entertainment_Districts/FeatureServer/0
Geometry: Polygon
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `Ordinance` | string | `"RES.36-2013"` | Establishing ordinance |
| `Adopt_Date` | number | `1377993600000` | Adoption date (epoch ms) |
| `Approved` | string | `"Todd Strange"` | Approved by |

> **GOTCHA:** No district name field. Identification relies on ordinance number only.

---

### 3.8 Zip Codes

```
Path:     Zip_Code/FeatureServer/0
Geometry: Polygon
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `NAME` | string | `"36115"` | Zip code |
| `ZCTA` | string | `"36115"` | Census zip code tabulation area |

> **GOTCHA:** There is a field named `SDE.ZIP_Codes.AREA` — a legacy SDE artifact with dots in the name. This will break in SQL `WHERE` clauses and most dictionary key lookups without explicit quoting.

---

### 3.9 Zoning

```
Path:     Zoning/FeatureServer/0
Geometry: Polygon
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `ZoningCode` | string | `"T4-O"` | Zoning code |
| `ZoningDesc` | string | `"General Urban Open"` | Zoning description |
| `Ordinance` | string | `"2007-036"` | Ordinance number |
| `Ord_Date` | string | `"2007-05-02"` | Ordinance date |
| `OrdDoc_Link` | string | — | Link to ordinance document (may be null) |

**Agent use:** Answer "can a business open here?" Cross-reference with permits for zoning compliance.

---

### 3.10 NSD Neighborhoods

```
Path:     NSD_Neighborhoods/FeatureServer/0
Geometry: Polygon
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `NEIGHBRHD` | string | `"Boylston Community"` | Neighborhood name |

**Agent use:** Community-level aggregation for all analytics.

---

### 3.11 Census Boundaries

```
Tracts:       Census_Boundaries/MapServer/0
Block Groups: Census_Boundaries/MapServer/1
Blocks:       Census_Boundaries/MapServer/2
Geometry:     Polygon
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `GEOID20` | string | `"01101000100"` | Census GEOID (FIPS) |
| `NAME20` | string | `"1"` | Tract/block number |
| `NAMELSAD20` | string | `"Census Tract 1"` | Full name |
| `ALAND20` | number | `2245795` | Land area (sq meters) |
| `AWATER20` | number | — | Water area (sq meters) |
| `INTPTLAT20` | string | `"+32.3792437"` | Internal point latitude |
| `INTPTLON20` | string | `"-086.3083898"` | Internal point longitude |

**Census Blocks bonus:** The block layer (MapServer/2) includes ~35 demographic fields — housing unit counts (`TOT_HH`, `OCC_HH`, `VAC_HH`) and P1–P5 population/race/ethnicity tables embedded directly.

> **GOTCHA:** Shape fields use single underscore (`Shape_Area`) unlike most other layers (`Shape__Area`).

**Agent use:** Demographic analysis. Cross-reference service locations with census demographics for equity analysis.

---

### 3.12 Parcels

```
Path:     Parcels/FeatureServer/0
Geometry: Polygon
```

| Field | Type | Example | Use |
|-------|------|---------|-----|
| `ParcelNo` | string | `"0901114000002000"` | Parcel number |
| `OwnerName` | string | `"CITY OF MONTGOMERY"` | Owner |
| `PropertyAddr1` | string | `"123 MAIN ST"` | Property address |
| `PropertyCity` | string | `"MONTGOMERY"` | City |
| `PropertyZip` | string | `"36101"` | Zip |
| `Neighborhood` | string | `"THE ORCHARDS"` | Neighborhood |
| `TotalValue` | number | `250000` | Total assessed value in dollars |
| `TotalLandValue` | number | `50000` | Land value in dollars |
| `TotalImpValue` | number | `200000` | Improvement value in dollars |
| `Calc_Acre` | number | `8.57` | Acreage |
| `RecordYear` | number | `2024` | Tax year |
| `FireDist` | string | — | Fire district |
| `AssessmentClass` | string | — | Assessment classification |

**Agent use:** Property-level analysis. Assessed values for neighborhood economic profiling.

---

### 3.13 Police Jurisdiction

```
Path:     OneView/Police_Jurisdiction/FeatureServer/4
Geometry: MultiPolygon
```

> **GOTCHA:** Layer ID is **4**, not 0. Returns valid geometry but `properties` is **completely empty** (`{}`). This layer is geometry-only — no queryable attributes.

**Agent use:** Jurisdiction boundary only. Useful for point-in-polygon checks, not attribute queries.

---

## 4. Other Folders

| Folder | Datasets | Notes |
|--------|----------|-------|
| **PublicWorks** | Pavement_Assessment_2025 | Road condition data (MapServer). |
| **QAlert** | QAlert_311 | Alternative 311 system (MapServer only). |
| **Utilities** | Unknown | **Requires authentication token.** Not publicly accessible. |
| **Capture** | CaptureBaseMap, Council Territories, Plume | Internal GIS capture layers. |
| **Hosted** | Paving, Requests (survey/reporter), Roads VectorTiles | Mix of feature and vector tile services. |

---

## Known Gotchas

### Field Name Truncation

Many field names are truncated to 10 characters (Shapefile legacy):

| Truncated Field | Full Meaning |
|----------------|-------------|
| `COMPANY_NA` | Company Name |
| `FACILITY_N` | Facility Name |
| `TYPE_FACIL` | Type of Facility |
| `BEDS_UNITS` | Beds/Units |
| `Night_Hour` | Night Hours |
| `Location_A` | Location Address |
| `Date_Insta` | Date Installed |
| `Average_Es` | Average Estimate |
| `Worst_Est_` | Worst Estimate |
| `PROP_ADDRE` | Property Address |
| `APPRAISED_` | Appraised Value |
| `STREET_NAM` | Street Name |

### Shape Field Naming Variants

Four different conventions exist across layers. Any generic utility must handle all:

| Convention | Example Layers |
|-----------|---------------|
| `Shape__Area` / `Shape__Length` (double underscore) | Most FeatureServer layers |
| `Shape_Area` / `Shape_Length` (single underscore) | Census MapServer layers |
| `Shape.STArea()` / `Shape.STLength()` (dot notation) | Military Bases MapServer |
| `Shape_STArea__` / `Shape_STLength__` | Historic Areas Properties |

### Spelling Inconsistencies

| Dataset | Field | Spelling |
|---------|-------|----------|
| Code Violations | `OffenceNum` | British ("offence") |
| Nuisance Reports | `OffenseNo` | American ("offense") |

### Date Formats

| Format | Datasets |
|--------|----------|
| Epoch milliseconds | 311 Requests (`Create_Date`, `Close_Date`), Nuisance (`Date`), Tornado Sirens (`Date_Insta`), Entertainment Districts (`Adopt_Date`), Paving (`CompletionDate`) |
| ISO date strings | Code Violations (`CaseDate`), Construction Permits (`IssuedDate`), Business Licenses (`pvEFFDATE`, `pvEXPIRE`) |
| Custom string | Nuisance hearings (`"2025/01/07"`) |

### Geometry Surprises

| Dataset | Expected | Actual |
|---------|----------|--------|
| City-Owned Properties | Point (listed under HostedDatasets) | **Polygon** |
| Paving Projects | Point (listed under HostedDatasets) | **Polyline** |
| Police Jurisdiction | Polygon with attributes | Polygon with **empty properties** |
| Tornado Sirens | Lat/Long fields match names | **Lat and Long are swapped** |

### Council District Field Inconsistency

| Dataset | Field | Type | Example |
|---------|-------|------|---------|
| 311 Requests | `District` | number | `1` |
| Code Violations | `CouncilDistrict` | string | `"DISTRICT 4"` |
| Nuisance | `District` | string | `"6"` |
| Construction Permits | `DistrictCouncil` | number | `9` |
| Paving Projects | `DistrictCode` | number | `3` |

Different name, different type, different format across every dataset. Normalize in your ETL layer.
