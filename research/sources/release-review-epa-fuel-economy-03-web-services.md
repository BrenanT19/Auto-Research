Source: https://www.fueleconomy.gov/feg/ws/index.shtml
Title: Fuel Economy Web Services
Fetched: 2026-10-08T02:35:44.579Z

[Skip to main content](https://www.fueleconomy.gov/feg/ws/#main-content)

# FuelEconomy.gov Web Services

Join our data users mail list to receive the latest news about FuelEconomy.gov data services
including Web services and downloads. To join, send an email to [FuelEconomyNews-join@elist.ornl.gov](mailto:FuelEconomyNews-join@elist.ornl.gov?subject=Join).


![](https://www.fueleconomy.gov/feg/images/findacar/info.gif) In order to make estimates comparable across model years, the MPG estimates for all 1984–2007 model year vehicles and some 2011–2016 model year vehicles have been revised. [Learn More](https://www.fueleconomy.gov/feg/ratings.shtml)

## Resources

### Basic Data Services

Data are available in either JSON or XML format.

- [/ws/rest/vehicle/{id}](https://www.fueleconomy.gov/feg/ws/#vehicle)\- Return a specific vehicle record

  - Example URL: [/ws/rest/vehicle/31873](https://www.fueleconomy.gov/ws/rest/vehicle/31873)
- [/ws/rest/vehicle/emissions/{id}](https://www.fueleconomy.gov/feg/ws/#emissions)\- Return a list of emission records for specific vehicle record

  - Example URL: [/ws/rest/vehicle/emissions/31873](https://www.fueleconomy.gov/ws/rest/vehicle/emissions/31873)
- [/ws/rest/fuelprices](https://www.fueleconomy.gov/feg/ws/#fuelprices)\- Return the fuel prices currently used by FuelEconomy.gov

  - Example URL: [/ws/rest/fuelprices](https://www.fueleconomy.gov/ws/rest/fuelprices)
- [/ws/rest/ympg/shared/ympgVehicle/{id}](https://www.fueleconomy.gov/feg/ws/#ympgVehicle)\- Return a summary of shared user MPG data for a specific vehicle ID

  - Example URL: [/ws/rest/ympg/shared/ympgVehicle/26425](https://www.fueleconomy.gov/ws/rest/ympg/shared/ympgVehicle/26425)
- [/ws/rest/ympg/shared/ympgDriverVehicle/{id}](https://www.fueleconomy.gov/feg/ws/#ympgDriverVehicle)\- Return a list of user MPG records for a specific vehicle ID

  - Example URL: [/ws/rest/ympg/shared/ympgDriverVehicle/26425](https://www.fueleconomy.gov/ws/rest/ympg/shared/ympgDriverVehicle/26425)

### Download the Vehicle Data

The Find a Car vehicle table contains fuel economy information for 1984-current model year vehicles. The data are available for download in CSV and XML formats:

- Vehicle
  - [CSV (Zipped)](https://www.fueleconomy.gov/feg/epadata/vehicles.csv.zip)
  - [CSV (Unzipped)](https://www.fueleconomy.gov/feg/epadata/vehicles.csv)
  - [XML](https://www.fueleconomy.gov/feg/epadata/vehicles.xml.zip)
- Emissions - linked to Vehicle by vehicle ID
  - [CSV (Zipped)](https://www.fueleconomy.gov/feg/epadata/emissions.csv.zip)
  - [CSV (Unzipped)](https://www.fueleconomy.gov/feg/epadata/emissions.csv)
  - [XML](https://www.fueleconomy.gov/feg/epadata/emissions.xml.zip)
- [EPA Revises MPG Estimates for 2013–17 Audi, Bentley, Porsche and Volkswagen vehicles](https://www.epa.gov/recalls/fuel-economy-label-updates#ad-bt-ps-vw)
- [EPA Revises MPG Estimates for 2014 MINI Cooper and Cooper S](https://www.epa.gov/recalls/fuel-economy-label-updates#bmw)
- [EPA Revises MPG Estimates for 2013-2014 Mercedes C300 4matic](https://www.epa.gov/recalls/fuel-economy-label-updates#mercedes)
- [EPA Revises MPG Estimates for 2013-2014 Ford Vehicles](https://www.epa.gov/recalls/fuel-economy-label-updates#ford)
- [2012-2013 Hyundai data revised](https://www.epa.gov/recalls/fuel-economy-label-updates#hyundai)
- [2012-2013 Kia data revised](https://www.epa.gov/recalls/fuel-economy-label-updates#kia)
- Updated: Tuesday September 29 2026
- Additional data are available for download at: [/feg/download.shtml](https://www.fueleconomy.gov/feg/download.shtml)

### Find a Car Menus

The resources at /ws/rest/vehicle/menu/\* are used to select a vehicle using a series of four menus: year, make, model, and options. A menu consists of a list of menu items, each with two properties: text and value.

- /ws/rest/vehicle/menu/year - Returns a list of model years
  - Example URL: [/ws/rest/vehicle/menu/year](https://www.fueleconomy.gov/ws/rest/vehicle/menu/year)
- /ws/rest/vehicle/menu/make?year=yyyy - Return a list of makes for a particular year
  - Example URL: [/ws/rest/vehicle/menu/make?year=2012](https://www.fueleconomy.gov/ws/rest/vehicle/menu/make?year=2012)
- /ws/rest/vehicle/menu/model?year=yyyy&make=mmmm - Return a list of models for a particular year and make
  - Example URL: [/ws/rest/vehicle/menu/model?year=2012&make=Honda](https://www.fueleconomy.gov/ws/rest/vehicle/menu/model?year=2012&make=Honda)
- ws/rest/vehicle/menu/options?year=2012&make=mmmm&model=nnnn - Return a list of model options and the associated vehicle ID for a particular year, make and model
  - Example URL: [ws/rest/vehicle/menu/options?year=2012&make=Honda&model=Fit](https://www.fueleconomy.gov/ws/rest/vehicle/menu/options?year=2012&make=Honda&model=Fit)

### My MPG Shared Data

This resource provides access to [My MPG](https://www.fueleconomy.gov/mpg/) shared data via vehicle make and model:

- Menu of shared make [/ws/rest/ympg/shared/menu/make](https://www.fueleconomy.gov/ws/rest/ympg/shared/menu/make)
- Menu of shared models for the specified make; for example [/ws/rest/ympg/shared/menu/model?make=Honda](https://www.fueleconomy.gov/ws/rest/ympg/shared/menu/model?make=Honda)
- List of vehicles with shared My MPG data; for example [/ws/rest/ympg/shared/vehicles?make=Honda&model=Fit](https://www.fueleconomy.gov/ws/rest/ympg/shared/vehicles?make=Honda&model=Fit)

## Data Description

### vehicle

- [atvtype](https://www.fueleconomy.gov/feg/ws/#atvtype) \- type of alternative fuel or advanced technology vehicle





  - Bifuel (CNG) - Bi-fuel gasoline and compressed natural gas vehicle
  - Bifuel (LPG) - Bi-fuel gasoline and propane vehicle
  - CNG - Compressed natural gas vehicle
  - Diesel - Diesel vehicle
  - EV - Electric vehicle
  - FFV - Flexible fueled vehicle (gasoline or E85)
  - Hybrid - Hybrid vehicle
  - Plug-in Hybrid - Plug-in hybrid vehicle

- barrels08 - annual petroleum consumption in barrels for [fuelType1](https://www.fueleconomy.gov/feg/ws/#fuelType1) [(1)](https://www.fueleconomy.gov/feg/ws/#ft1)
- barrelsA08 - annual petroleum consumption in barrels for [fuelType2](https://www.fueleconomy.gov/feg/ws/#fuelType2) [(1)](https://www.fueleconomy.gov/feg/ws/#ft1)
- charge120 - time to charge an electric vehicle in hours at 120 V
- charge240 - time to charge an electric vehicle in hours at 240 V
- city08 - city MPG for [fuelType1](https://www.fueleconomy.gov/feg/ws/#fuelType1) [(2)](https://www.fueleconomy.gov/feg/ws/#ft2), [(11)](https://www.fueleconomy.gov/feg/ws/#ft11)
- city08U - unrounded city MPG for [fuelType1](https://www.fueleconomy.gov/feg/ws/#fuelType1) [(2)](https://www.fueleconomy.gov/feg/ws/#ft2), [(3)](https://www.fueleconomy.gov/feg/ws/#ft3)
- cityA08 - city MPG for [fuelType2](https://www.fueleconomy.gov/feg/ws/#fuelType2) [(2)](https://www.fueleconomy.gov/feg/ws/#ft2)
- cityA08U - unrounded city MPG for [fuelType2](https://www.fueleconomy.gov/feg/ws/#fuelType2) [(2)](https://www.fueleconomy.gov/feg/ws/#ft2), [(3)](https://www.fueleconomy.gov/feg/ws/#ft3)
- cityCD - city gasoline consumption (gallons/100 miles) in charge depleting mode [(4)](https://www.fueleconomy.gov/feg/ws/#ft4)
- cityE - city electricity consumption in kWh/100 miles
- cityMpk - city miles per kilogram for hydrogen
- cityUmpk - unrounded city miles per kilogram for hydrogen
- cityUF - EPA city utility factor (share of electricity) for PHEV
- co2 - tailpipe CO2 in grams/mile for [fuelType1](https://www.fueleconomy.gov/feg/ws/#fuelType1) [(5)](https://www.fueleconomy.gov/feg/ws/#ft5)
- co2A - tailpipe CO2 in grams/mile for [fuelType2](https://www.fueleconomy.gov/feg/ws/#fuelType2) [(5)](https://www.fueleconomy.gov/feg/ws/#ft5)
- co2TailpipeAGpm - tailpipe CO2 in grams/mile for [fuelType2](https://www.fueleconomy.gov/feg/ws/#fuelType2) [(5)](https://www.fueleconomy.gov/feg/ws/#ft5)
- co2TailpipeGpm- tailpipe CO2 in grams/mile for [fuelType1](https://www.fueleconomy.gov/feg/ws/#fuelType1) [(5)](https://www.fueleconomy.gov/feg/ws/#ft5)
- comb08 - combined MPG for [fuelType1](https://www.fueleconomy.gov/feg/ws/#fuelType1) [(2)](https://www.fueleconomy.gov/feg/ws/#ft2), [(11)](https://www.fueleconomy.gov/feg/ws/#ft11)
- comb08U - unrounded combined MPG for [fuelType1](https://www.fueleconomy.gov/feg/ws/#fuelType1) [(2)](https://www.fueleconomy.gov/feg/ws/#ft2), [(3)](https://www.fueleconomy.gov/feg/ws/#ft3)
- combA08 - combined MPG for [fuelType2](https://www.fueleconomy.gov/feg/ws/#fuelType2) [(2)](https://www.fueleconomy.gov/feg/ws/#ft2)
- combA08U - unrounded combined MPG for [fuelType2](https://www.fueleconomy.gov/feg/ws/#fuelType2) [(2)](https://www.fueleconomy.gov/feg/ws/#ft2), [(3)](https://www.fueleconomy.gov/feg/ws/#ft3)
- combE - combined electricity consumption in kWh/100 miles
- combMpk - combined miles per kilogram for hydrogen
- combUmpk - unrounded combined miles per kilogram for hydrogen
- combinedCD - combined gasoline consumption (gallons/100 miles) in charge depleting mode [(4)](https://www.fueleconomy.gov/feg/ws/#ft4)
- combinedUF - EPA combined utility factor (share of electricity) for PHEV
- cylinders - engine cylinders
- displ - engine displacement in liters
- [drive](https://www.fueleconomy.gov/feg/ws/#drive) \- drive axle type





  - 2-Wheel Drive
  - 4-Wheel Drive\*
  - 4-Wheel or All-Wheel Drive\*
  - All-Wheel Drive\*
  - Front-Wheel Drive
  - Part-time 4-Wheel Drive\*
  - Rear-Wheel Drive

\*Prior to Model Year 2010, EPA did not differentiate between All Wheel Drive and Four Wheel Drive

- [emissionsList](https://www.fueleconomy.gov/feg/ws/#emissions)
- engId - EPA model type index
- eng\_dscr - engine descriptor; see http://www.fueleconomy.gov/feg/findacarhelp.shtml#engine
- evMotor - electric motor (kW)
- feScore - EPA Fuel Economy Score (-1 = Not available)
- fuelCost08 - annual fuel cost for [fuelType1](https://www.fueleconomy.gov/feg/ws/#fuelType1) ($) [(7)](https://www.fueleconomy.gov/feg/ws/#ft7)
- fuelCostA08 - annual fuel cost for [fuelType2](https://www.fueleconomy.gov/feg/ws/#fuelType2) ($) [(7)](https://www.fueleconomy.gov/feg/ws/#ft7)
- fuelType - fuel type with [fuelType1](https://www.fueleconomy.gov/feg/ws/#fuelType1) and [fuelType2](https://www.fueleconomy.gov/feg/ws/#fuelType2) (if applicable)
- fuelType1 - fuel type 1. For single fuel vehicles, this will be the only fuel. For dual fuel vehicles, this will be the conventional fuel.
- fuelType2 - fuel type 2. For dual fuel vehicles, this will be the alternative fuel (e.g., E85, Electricity, CNG, LPG). For single fuel vehicles, this field is not used
- ghgScore - EPA GHG score (-1 = Not available)
- ghgScoreA - EPA GHG score for dual fuel vehicle running on the alternative fuel (-1 = Not available)
- guzzler- if G or T, this vehicle is subject to the gas guzzler tax
- highway08 - highway MPG for [fuelType1](https://www.fueleconomy.gov/feg/ws/#fuelType1) [(2)](https://www.fueleconomy.gov/feg/ws/#ft2), [(11)](https://www.fueleconomy.gov/feg/ws/#ft11)
- highway08U - unrounded highway MPG for [fuelType1](https://www.fueleconomy.gov/feg/ws/#fuelType1) [(2)](https://www.fueleconomy.gov/feg/ws/#ft2), [(3)](https://www.fueleconomy.gov/feg/ws/#ft3)
- highwayA08 - highway MPG for [fuelType2](https://www.fueleconomy.gov/feg/ws/#fuelType2) [(2)](https://www.fueleconomy.gov/feg/ws/#ft2)
- highwayA08U - unrounded highway MPG for [fuelType2](https://www.fueleconomy.gov/feg/ws/#fuelType2) [(2)](https://www.fueleconomy.gov/feg/ws/#ft2), [(3)](https://www.fueleconomy.gov/feg/ws/#ft3)
- highwayCD - highway gasoline consumption (gallons/100 miles) in charge depleting mode [(4)](https://www.fueleconomy.gov/feg/ws/#ft4)
- highwayE - highway electricity consumption in kWh/100 miles
- highwayMpk - highway miles per kilogram for hydrogen
- highwayUmpk - unrounded highway miles per kilogram for hydrogen
- highwayUF - EPA highway utility factor (share of electricity) for PHEV
- hlv - hatchback luggage volume (cubic feet) [(8)](https://www.fueleconomy.gov/feg/ws/#ft8)
- hpv - hatchback passenger volume (cubic feet) [(8)](https://www.fueleconomy.gov/feg/ws/#ft8)
- id - vehicle record id
- lv2 - 2-door luggage volume (cubic feet) [(8)](https://www.fueleconomy.gov/feg/ws/#ft8)
- lv4 - 4-door luggage volume (cubic feet) [(8)](https://www.fueleconomy.gov/feg/ws/#ft8)
- make - manufacturer (division)
- mfrCode - 3-character manufacturer code
- model - model name (carline)
- mpgData - has My MPG data; see [yourMpgVehicle](https://www.fueleconomy.gov/feg/ws/#ympgVehicle) and [yourMpgDriverVehicle](https://www.fueleconomy.gov/feg/ws/#ympgDriverVehicle)
- phevBlended - if true, this vehicle operates on a blend of gasoline and electricity in charge depleting mode
- pv2 - 2-door passenger volume (cubic feet) [(8)](https://www.fueleconomy.gov/feg/ws/#ft8)
- pv4 - 4-door passenger volume (cubic feet) [(8)](https://www.fueleconomy.gov/feg/ws/#ft8)
- rangeA - EPA range for [fuelType2](https://www.fueleconomy.gov/feg/ws/#fuelType2)
- rangeCityA - EPA city range for [fuelType2](https://www.fueleconomy.gov/feg/ws/#fuelType2)
- rangeHwyA - EPA highway range for [fuelType2](https://www.fueleconomy.gov/feg/ws/#fuelType2)
- trans\_dscr - transmission descriptor; see http://www.fueleconomy.gov/feg/findacarhelp.shtml#trany
- trany - transmission
- UCity - unadjusted city MPG for [fuelType1](https://www.fueleconomy.gov/feg/ws/#fuelType1); see the description of the [EPA test procedures](https://www.fueleconomy.gov/feg/fe_test_schedules.shtml)
- UCityA - unadjusted city MPG for [fuelType2](https://www.fueleconomy.gov/feg/ws/#fuelType2); see the description of the [EPA test procedures](https://www.fueleconomy.gov/feg/fe_test_schedules.shtml)
- UHighway - unadjusted highway MPG for [fuelType1](https://www.fueleconomy.gov/feg/ws/#fuelType1); see the description of the [EPA test procedures](https://www.fueleconomy.gov/feg/fe_test_schedules.shtml)
- UHighwayA - unadjusted highway MPG for [fuelType2](https://www.fueleconomy.gov/feg/ws/#fuelType2); see the description of the [EPA test procedures](https://www.fueleconomy.gov/feg/fe_test_schedules.shtml)
- [VClass](https://www.fueleconomy.gov/feg/ws/#VClass) \- EPA vehicle size class





  - Two-Seaters - Any (cars designed to seat only two adults)
  - Minicompact Cars - Less than 85 cu ft.
  - Subcompact Cars - 85 to 99 cu ft.
  - Compact Cars - 100 to 109 cu ft.
  - Mid-Size Cars - 110 to 119 cu ft.
  - Large Cars - 120 or more cu ft.
  - Small Station Wagons- Less than 130 cu ft.
  - Mid-Size Cars Station Wagons- 130 to 159 cu ft.
  - Large Cars Station Wagons- 160 or more cu ft.
  - Small Pickup Trucks - Less than 4,500 lbs GVWR through Model Year 2007
  - Small Pickup Trucks - Less than 6,000 lbs GVWR after Model Year 2008
  - Standard Pickup Trucks - 4,500 to 8,500 lbs GVWR through Model Year 2007
  - Standard Pickup Trucks - 6,000 to 8,500 lbs GVWR after Model Year 2008
  - Passenger Vans - Less than 8,500 lbs GVWR through Model Year 2010
  - Passenger Vans - Less than 10,000 lbs GVWR beginning Model Year 2011
  - Cargo Vans - Less than 8,500 lbs GVWR
  - Minivans - Less than 8,500 lbs GVWR
  - Sport Utility Vehicles (SUVs) - Less than 8,500 lbs GVWR through Model Year 2010
  - Sport Utility Vehicles (SUVs) - Less than 10,000 lbs GVWR beginning Model Year 2011
  - Small Sport Utility Vehicles (SUVs) - Less than 6,000 lbs GVWR beginning Model Year 2013
  - Standard Sport Utility Vehicles (SUVs) - 6,000 to 10,000 lbs GVWR beginning Model Year 2013
  - Special Purpose Vehicles - Less than 8,500 lbs GVWR through Model Year 2010
  - Special Purpose Vehicles - Less than 10,000 lbs GVWR beginning Model Year 2011
  - \*Gross Vehicle Weight Rating (GVWR) is calculated as truck weight plus carrying capacity.

- year - model year
- youSaveSpend - you save/spend over 5 years compared to an average car ($). Savings are positive; a greater amount spent yields a negative number. For dual fuel vehicles, this is the cost savings for gasoline
- sCharger - if S, this vehicle is supercharged
- tCharger - if T, this vehicle is turbocharged
- c240Dscr - electric vehicle charger description
- charge240b - time to charge an electric vehicle in hours at 240 V using the alternate charger
- c240bDscr - electric vehicle alternate charger description
- createdOn - date the vehicle record was created
- modifiedOn - date the vehicle record was last modified
- startStop - vehicle has stop-start technology (Y, N, or blank for older vehicles)
- phevCity - EPA composite gasoline-electricity city MPGe for plug-in hybrid vehicles
- phevHwy - EPA composite gasoline-electricity highway MPGe for plug-in hybrid vehicles
- phevComb - EPA composite gasoline-electricity combined city-highway MPGe for plug-in hybrid vehicles
- basemodel - base model name

### emissions

- emissionsList
  - emissionsInfo
    - efid - engine family ID
    - id - vehicle record ID (links emission data to the vehicle record)
    - [salesArea](https://www.fueleconomy.gov/feg/ws/#salesArea) \- EPA sales area code





      The area of the country where the vehicle can legally be sold. New federally certified vehicles can be sold in all states except California and those states that have adopted California emission standards. New California vehicles can be sold in California and in states that have adopted the California emission standards as well as bordering states.



      - 1 = EPA Sales Area 1 - California\* + National Low Emission Vehicle All States Trading Region
      - 2 = EPA Sales Area 2 - Clean Fuel Vehicle + National Low Emission Vehicle All States Trading Region + California\*
      - 3 = EPA Sales Area 3 - Federal All Altitude
      - 4 = EPA Sales Area 4 - National Low Emission Vehicle All States Trading Region
      - 6 = EPA Sales Area 5 - California\* + National Low Emission Vehicle North East States Trading Region
      - 7 = EPA Sales Area 7 - California\*
      - 8 = EPA Sales Area 8 - Clean Fuel Vehicle
      - 9 = EPA Sales Area 9 - Tier 2 Federal and California\*

\*California includes California, states that have adopted the California emission standards, and border states

    - score - EPA smog rating from 1 (worst) to 10 (best) for [fuelType1](https://www.fueleconomy.gov/feg/ws/#fuelType1)
    - scoreAlt - EPA smog rating from 1 (worst) to 10 (best) for [fuelType2](https://www.fueleconomy.gov/feg/ws/#fuelType2)
    - [smartwayScore](https://www.fueleconomy.gov/feg/ws/#smartwayScore) \- SmartWay Code





            - -1 - No
      - 1 - Smartway
      - 2 - Smartway Elite

    - [standard](https://www.fueleconomy.gov/feg/ws/#standard) \- Vehicle Emission Standard Code





      - B1 - Bin 1
      - B2 - Bin 2
      - B3 - Bin 3
      - B4 - Bin 4
      - B5 - Bin 5
      - B7 - Bin 7
      - B8 - Bin 8
      - B9 - Bin 9
      - Bin 10 - Bin 10
      - L1 - LEV
      - L2 - LEV-II
      - L2OP - LEV-II Optional
      - LEV - LEV
      - PZEV - PZEV
      - S1 - SULEV
      - SLEV - SULEV
      - T1 - Tier 1
      - L2 - LEV-II
      - BU1 - ULEV
      - U2 - LEV-II ULEV
      - ULEV - ULEV
      - ZEV - ZEV

For additional information visit EPA's [Emission Standards Reference Guide](http://www.epa.gov/otaq/standards/light-duty/).

    - [stdText](https://www.fueleconomy.gov/feg/ws/#standard2) \- Vehicle Emission Standard





      - B1 - Bin 1
      - B2 - Bin 2
      - B3 - Bin 3
      - B4 - Bin 4
      - B5 - Bin 5
      - B7 - Bin 7
      - B8 - Bin 8
      - B9 - Bin 9
      - Bin 10 - Bin 10
      - L1 - LEV
      - L2 - LEV-II
      - L2OP - LEV-II Optional
      - LEV - LEV
      - PZEV - PZEV
      - S1 - SULEV
      - SLEV - SULEV
      - T1 - Tier 1
      - L2 - LEV-II
      - BU1 - ULEV
      - U2 - LEV-II ULEV
      - ULEV - ULEV
      - ZEV - ZEV

For additional information visit EPA's [Emission Standards Reference Guide](http://www.epa.gov/otaq/standards/light-duty/).

### fuel prices

- fuelPrices
  - midgrade - dollars per gallon of midgrade gasoline [(9)](https://www.fueleconomy.gov/feg/ws/#ft9)
  - premium - dollars per gallon of premium gasoline [(9)](https://www.fueleconomy.gov/feg/ws/#ft9)
  - regular - dollars per gallon of regular gasoline [(9)](https://www.fueleconomy.gov/feg/ws/#ft9)
  - cng - dollars per gallon of gasoline equivalent (GGE) of compressed natural gas [(10)](https://www.fueleconomy.gov/feg/ws/#ft10)
  - diesel - dollars per gallon of diesel [(9)](https://www.fueleconomy.gov/feg/ws/#ft9)
  - e85 - dollars per gallon of E85 [(10)](https://www.fueleconomy.gov/feg/ws/#ft10)
  - electric - dollars per kWh of electricity [(10)](https://www.fueleconomy.gov/feg/ws/#ft10)
  - lpg - dollars per gallon of propane [(10)](https://www.fueleconomy.gov/feg/ws/#ft10)

### yourMpgVehicle - summary of all My MPG data for this vehicle

- avgMpg - harmonic mean of average MPG shared by fueleconomy.gov users
- cityPercent - average percentage of city miles
- highwayPercent - average percentage of highway miles
- maxMpg - maximum user average MPG
- minMpg - minimum user average MPG
- recordCount - number of records for this vehicle
- vehicleId - vehicle record id (links My MPG data to the vehicle record)

### yourMpgDriverVehicle - summary of driver data reported for this vehicle

- cityPercent - user average percentage of city miles
- highwayPercent - user average percentage of highway miles
- lastDate - date records were last updated (yyyy-mm-dd)
- mpg - average MPG
- state - state of residence
- vehicleId - vehicle record ID (links My MPG data to the vehicle record)

### Footnotes:

(1) 1 barrel = 42 gallons. Petroleum consumption is estimated using the Department of Energy's GREET model and includes petroleum consumed from production and refining to distribution and final use. Vehicle manufacture is excluded.

(2) The MPG estimates for all 1985–2007 model year vehicles and some 2011–2016 model year vehicles have been updated. [![](https://www.fueleconomy.gov/feg/images/findacar/info.gif) Learn More](https://www.fueleconomy.gov/feg/ratings.shtml)

(3) Unrounded MPG values are not available for some vehicles.

(4) This field is only used for blended PHEV vehicles.

(5) For model year 2013 and beyond, tailpipe CO2 is based on EPA tests. For previous model years, CO2 is estimated using an EPA emission factor. -1 = Not Available.

(6) For PHEVs this is the charge depleting range.

(7) Annual fuel cost is based on 15,000 miles, 55% city driving, and the price of fuel used by the vehicle.

(8) Interior volume dimensions are not required for two-seater passenger cars or any vehicle classified as truck which includes vans, pickups, special purpose vehicles, minivan and sport utility vehicles.

(9) Fuel prices for gasoline and diesel fuel are from the Energy Information Administration and are usually updated weekly.

(10) Fuel prices for E85, LPG, and CNG are from the Office of Energy Efficiency and Renewable Energy's Alternative Fuel Price Report and are updated quarterly.

(11) For electric and CNG vehicles this number is MPGe (gasoline equivalent miles per gallon).

This website is administered by Oak Ridge National Laboratory for the U.S. Department of Energy and the U.S. Environmental Protection Agency.

This website is administered by Oak Ridge National Laboratory for the U.S. DOE and the U.S. EPA.

[![U.S. Department of Energy - Energy Efficiency and Renewable Energy](https://www.fueleconomy.gov/feg/images/home/Logo_Black_Seal_Black_Lettering_Horizontal.png)](https://www.eere.energy.gov/)

[![U.S. Environmental Protection Agency - Office of Transportation and Air Quality](https://www.fueleconomy.gov/feg/images/home/EPA_logo_black.png)](https://www.epa.gov/otaq/)