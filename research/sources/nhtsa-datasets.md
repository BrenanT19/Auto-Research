Source: https://www.nhtsa.gov/nhtsa-datasets-and-apis
Title: NHTSA Datasets and APIs | NHTSA
Fetched: 2026-10-01T21:32:16.582Z

[Skip to main content](https://www.nhtsa.gov/nhtsa-datasets-and-apis#main-content)

![](https://www.nhtsa.gov/themes/custom/nhtsa_2024/images/article-three-header.jpg)

# NHTSA Datasets and APIs


In Support of Open Government Directive



Share: [_Facebook_](https://www.facebook.com/sharer/sharer.php?u=https://www.nhtsa.gov/nhtsa-datasets-and-apis) [_Twitter_](https://twitter.com/intent/tweet?url=https://www.nhtsa.gov/nhtsa-datasets-and-apis) [_LinkedIn_](https://www.linkedin.com/shareArticle?mini=true&url=https://www.nhtsa.gov/nhtsa-datasets-and-apis) [_Mail_](mailto:?subject=NHTSA%20Datasets%20and%20APIs&body=https://www.nhtsa.gov/nhtsa-datasets-and-apis)

NHTSA Datasets and APIs [Ratings](https://www.nhtsa.gov/nhtsa-datasets-and-apis#ratings) [Recalls](https://www.nhtsa.gov/nhtsa-datasets-and-apis#recalls) [Investigations](https://www.nhtsa.gov/nhtsa-datasets-and-apis#investigations) [Complaints](https://www.nhtsa.gov/nhtsa-datasets-and-apis#complaints) [Manufacturer Communications](https://www.nhtsa.gov/nhtsa-datasets-and-apis#manufacturer-communications) [Car Seat Inspection Locator](https://www.nhtsa.gov/nhtsa-datasets-and-apis#car-seat-inspection-locator)

NHTSA Datasets and APIs


- [Ratings](https://www.nhtsa.gov/nhtsa-datasets-and-apis#ratings)
- [Recalls](https://www.nhtsa.gov/nhtsa-datasets-and-apis#recalls)
- [Investigations](https://www.nhtsa.gov/nhtsa-datasets-and-apis#investigations)
- [Complaints](https://www.nhtsa.gov/nhtsa-datasets-and-apis#complaints)
- [Manufacturer Communications](https://www.nhtsa.gov/nhtsa-datasets-and-apis#manufacturer-communications)
- [Car Seat Inspection Locator](https://www.nhtsa.gov/nhtsa-datasets-and-apis#car-seat-inspection-locator)

# Ratings

NHTSA's New Car Assessment Program conducts crash tests to determine how well a vehicle protects its occupants during a crash, and rollover resistance tests to determine the risk of a vehicle rolling over in a single-vehicle crash. Also, NCAP conducts advanced driver assistance system tests to determine how well the system avoids a crash.

## Background

**Crashworthiness**

- Test data obtained from the crashworthiness and rollover tests are used to generate safety ratings for each vehicle, which are included on a label required to be placed on each new vehicle at the point of sale. A rating of five stars indicates the highest safety rating, whereas a one star indicates the lowest rating.

**Crash Avoidance**

- Data collected from the program’s crash avoidance tests are used to provide safety technology recommendations based on system performance.

The star ratings information and safety technology recommendations provide consumers with important vehicle safety information to help them make informed purchasing decisions. All tests are conducted under controlled conditions at laboratories contracted by NHTSA.

## Metadata

#### Dataset Summary

Agency: **Department of Transportation**

Sub-Agency/Organization: **National Highway Traffic Safety Administration**

Category: 23, **Transportation**

Date Released: **January 5, 2010**

Time Period: **1990 to present**

Frequency: **Annual**

#### Dataset Information

Data.gov Data Category Type: **Raw data**

Specialized Data Category Designation: **Research**

Keywords: **New, Car, Assessment, Program, NCAP, Five, 5, Star, Safety, Rating, Ratings**

Unique ID: **5**

#### Dataset Coverage

Unit of Analysis: **Vehicles**

Granularity: N/A

Geographic Coverage: N/A

#### Dataset Quality

Data Quality Certification: No

Privacy and Confidentiality: No

Applicable Information Quality Guideline Designation: **National Highway Traffic Safety Administration**

## API

#### Approach A. Get by Model Year, Make, Model

**Step 1: Get available vehicle variants for a selected Model Year, Make and Model**

Make the request to get the crash tested vehicle variants for the Model Year, Make and Model combination.

- /SafetyRatings/modelyear/2013/make/Acura/model/rdx

Response Fields: Response is a list of vehicle variants for Model Year, Make and Model with their Vehicle Id and description of the variant.

Working Sample: [JSON](https://api.nhtsa.gov/SafetyRatings/modelyear/2013/make/Acura/model/rdx)

**Step 2: Get the Safety Ratings for the selected variant**

Now that you have the Vehicle Id of the precise model that you to look up, go ahead and make the request to get the Safety Ratings for the required vehicle variant by passing in the Vehicle Id.

- /SafetyRatings/VehicleId/7520

Response Fields: Response is a list of Safety Ratings for the given vehicle variant.

Working Sample: [JSON](https://api.nhtsa.gov/SafetyRatings/VehicleId/7520)

* * *

#### Approach B. Get by Model Year, Make, Model

**Step 1: Get all Model Years**

Request a list of available Model Years for a given product type (Vehicle).

- /SafetyRatings

Response Fields: Response is a list of available Model Years in the repository. Use a Model Year from this list to use in the next step.

Working Sample: [JSON](https://api.nhtsa.gov/SafetyRatings)

**Step 2: Get all Makes for the Model Year**

Request a list of vehicle Makes by providing a specific vehicle Model Year.

- /SafetyRatings/modelyear/2013

Response Fields: Response is a list of vehicle Makes for that Model Year. Use the Model Year and a Make from this list to use in the next step.

Working Sample: [JSON](https://api.nhtsa.gov/SafetyRatings/modelyear/2013)

**Step 3: Get all Model for the Make and Model Year**

Request a list of vehicle Models by providing the vehicle Model Year and Make.

- /SafetyRatings/modelyear/2013/make/Acura

Response Fields:  Response is a list of Safety Ratings for the given Model Year, Make and Model

Working Sample: [JSON](https://api.nhtsa.gov/SafetyRatings/modelyear/2013/make/Acura)

**Step 4: Get available vehicle variants for a selected Model Year, Make and Model**

Make the request to get the crash tested vehicle variants for the Model Year, Make and Model combination.

- /SafetyRatings/modelyear/2013/make/Acura/model/rdx

Response Fields: Response is a list of vehicle variants for Model Year, Make and Model with their Vehicle Id and description of the variant.

Working Sample: [JSON](https://api.nhtsa.gov/SafetyRatings/modelyear/2013/make/Acura/model/rdx)

**Step 5: Get the Safety Ratings for the selected variant**

Now that you have the Vehicle Id of the precise model that you to look up, go ahead and make the request to get the Safety Ratings for the required vehicle variant by passing in the Vehicle Id.

- /SafetyRatings/VehicleId/7520

Response Fields: Response is a list of Safety Ratings for the given vehicle variant.

Working Sample: [JSON](https://api.nhtsa.gov/SafetyRatings/VehicleId/7520)

* * *

#### Notes

Color codes to understand each part of the request URL:

- Red: Method Name
- Green: Applicable parameters

Request parameters and method names are case-sensitive.

## Download Data

Select a file below to download.

Hide lower priority columns

| Path | Size | Updated |
| --- | --- | --- |
|  |
| --- |
| [Safercar\_data.csv](https://static.nhtsa.gov/nhtsa/downloads/Safercar/Safercar_data.csv) | 9 MB | 08/07/2026 07:31:14 AM ET |
| [Safercar\_data\_READ\_ME\_file.txt](https://static.nhtsa.gov/nhtsa/downloads/Safercar/Safercar_data_READ_ME_file.txt) | 14 KB | 02/03/2026 09:01:54 PM ET |

# Recalls

Manufacturers who determine that a product or piece of original equipment either has a safety defect, or is not in compliance with federal safety standards, are required to notify NHTSA within five business days. NHTSA requires that manufacturers file a defect and noncompliance report as well as quarterly recall status reports, in compliance with Federal Regulation 49 (the National Traffic and Motor Safety Act) Part 573, which identifies the requirements for safety recalls. NHTSA stores this information and the data can be used to search for recall information related to specific NHTSA campaigns and product types.

## Metadata

#### Dataset Summary

Agency: **Department of Transportation**

Sub-Agency/Organization: **National Highway Traffic Safety Administration**

Category: 23, **Transportation**

Date Released: **December 16, 2002**

Time Period: **1949 to present**

Frequency: **Daily**

#### Dataset Information

Data.gov Data Category Type: **Raw data**

Specialized Data Category Designation: **Research**

Keywords: **Phone, Paper, Email**

Unique ID: **83**

#### Contributing Agency Information

Citation: N/A

Agency Program Page: [https://www.nhtsa.gov/recalls](https://www.nhtsa.gov/recalls)

Agency Data Series: [https://static.nhtsa.gov/odi/ffdd/rcl/FLAT\_RCL\_POST\_2010.zip](https://static.nhtsa.gov/odi/ffdd/rcl/FLAT_RCL_POST_2010.zip)

#### Dataset Coverage

Unit of Analysis: **Vehicles, Tires, Child Safety Seats, Equipment**

Granularity: **United States**

Geographic Coverage: N/A

#### Data Description

Collection Mode: N/A

Data Collection Instrument: N/A

Data Dictionary/Variable List: [https://static.nhtsa.gov/odi/ffdd/rcl/RCL.txt](https://static.nhtsa.gov/odi/ffdd/rcl/RCL.txt)

#### Dataset Quality

Data Quality Certification: **Yes**

Privacy and Confidentiality: **Yes**

Applicable Information Quality Guideline Designation: **National Highway Traffic Safety Administration**

#### Additional Dataset Documentation

Technical Documentation: [https://static.nhtsa.gov/odi/ffdd/rcl/Import\_Instructions\_Recalls.pdf](https://static.nhtsa.gov/odi/ffdd/rcl/Import_Instructions_Recalls.pdf)

Additional Metadata: N/A

## API

#### Approach A: Get by Model Year, Make, Model

Make the request to get the recalls for the required combination of Model Year, Make and Model.

- Syntax: api.nhtsa.gov/recalls/recallsByVehicle?make={MAKE}&model={MODEL}&modelYear={MODEL\_YR}
- Example:https://api.nhtsa.gov/recalls/recallsByVehicle?make=acura&model=rdx&modelYear=2012

Response Fields: Response is a list of recalls for the given Model Year, Make and Model.

Working Sample: [JSON](https://api.nhtsa.gov/recalls/recallsByVehicle?make=acura&model=rdx&modelYear=2012)

* * *

#### Approach B: Get by Model Year, Make, Model

**Step 1: Get all Model Years**

Request a list of available Model Years for a given product type (Vehicle).

- Syntax: api.nhtsa.gov/products/vehicle/modelYears?issueType=r
- Example: https://api.nhtsa.gov/products/vehicle/modelYears?issueType=r

Working Sample: [JSON](https://api.nhtsa.gov/products/vehicle/modelYears?issueType=r)

**Step 2: Get all Makes for the Model Year**

Request a list of vehicle Makes by providing a specific vehicle Model Year.

- Syntax: api.nhtsa.gov/products/vehicles/makes?modelYear={year}&issueType=r
- Example: https://api.nhtsa.gov/products/vehicle/makes?modelYear=2021&issueType=r

Response Fields: Response is a list of vehicle Makes for that Model Year. Use the Model Year and a Make from this list to use in the next step.

Working Sample: [JSON](https://api.nhtsa.gov/products/vehicle/makes?modelYear=2021&issueType=r)

**Step 3: Get all Model for the Make and Model Year**

Request a list of vehicle Models by providing the vehicle Model Year and Make.

- Syntax: api.nhtsa.gov/products/vehicle/models?modelYear={year}&make={make}&issueType=r
- Example: https://api.nhtsa.gov/products/vehicle/models?modelYear=2010&make=acura&issueType=r

Working Sample: [JSON](https://api.nhtsa.gov/products/vehicle/models?modelYear=2010&make=acura&issueType=r)

**Step 4 : Get all Recalls for the selected Model Year, Make, Model**

Now that you have all three key pieces of information (Model Year, Make, Model), go ahead and make the request to get the recalls for the required combination.

- Syntax: api.nhtsa.gov/recalls/recallsByVehicle?make={MAKE}&model={MODEL}&modelYear={MODEL\_YR}
- Example: https://api.nhtsa.gov/recalls/recallsByVehicle?make=acura&model=rdx&modelYear=2012

Response Fields: Response is a list of recalls for the given Model Year, Make and Model.

Working Sample: [JSON](https://api.nhtsa.gov/recalls/recallsByVehicle?make=acura&model=rdx&modelYear=2012)

* * *

#### Approach C. Get by NHTSA Campaign Number

**Get all recalls as part of a NHTSA recall campaign number**

Request a list of recalls by providing the NHTSA recall campaign number

- Syntax: api.nhtsa.gov/recalls/campaignNumber?campaignNumber ={campaignNumber}
- Example: https://api.nhtsa.gov/recalls/campaignNumber?campaignNumber=12V176000

Response Fields: Response is a list of recalls for the specified NHTSA recall campaign number.

Working Sample: [JSON](https://api.nhtsa.gov/recalls/campaignNumber?campaignNumber=12V176000)

* * *

#### Notes

Color codes to understand each part of the request URL:

- Red: Method Name
- Green: Applicable parameters

Request parameters and method names are case sensitive

## Data Dashboard

View recalls by manufacturer [interactive dashboard](https://data.transportation.gov/dataset/NHTSA-Recalls-by-Manufacturer/mu99-t4jn).

## Download Data

Select the .zip file for the desired database to download and extract the data. See the corresponding.txt file for a description of the file layout. All times shown are Eastern Time (ET).

Hide lower priority columns

| Path | Size | Updated |
| --- | --- | --- |
|  |
| --- |
| [Import\_Instructions\_Recalls.pdf](https://static.nhtsa.gov/odi/ffdd/rcl/Import_Instructions_Recalls.pdf) | 1006 KB | 10/27/2023 11:02:49 AM ET |
| [FLAT\_RCL\_Annual\_Rpts.zip](https://static.nhtsa.gov/odi/ffdd/rcl/FLAT_RCL_Annual_Rpts.zip) | 171 KB | 10/01/2026 03:04:57 AM ET |
| [FLAT\_RCL\_POST\_2010.zip](https://static.nhtsa.gov/odi/ffdd/rcl/FLAT_RCL_POST_2010.zip) | 14 MB | 10/01/2026 03:04:57 AM ET |
| [FLAT\_RCL\_PRE\_2010.zip](https://static.nhtsa.gov/odi/ffdd/rcl/FLAT_RCL_PRE_2010.zip) | 7 MB | 10/01/2026 03:04:57 AM ET |
| [FLAT\_RCL\_Qrtly\_Rpts.zip](https://static.nhtsa.gov/odi/ffdd/rcl/FLAT_RCL_Qrtly_Rpts.zip) | 1 MB | 10/01/2026 03:04:57 AM ET |
| [RCL.txt](https://static.nhtsa.gov/odi/ffdd/rcl/RCL.txt) | 3 KB | 10/01/2026 03:04:57 AM ET |
| [RCL\_Annual\_Rpts.txt](https://static.nhtsa.gov/odi/ffdd/rcl/RCL_Annual_Rpts.txt) | 2 KB | 10/01/2026 03:04:57 AM ET |
| [RCL\_FROM\_2000\_2004.zip](https://static.nhtsa.gov/odi/ffdd/rcl/RCL_FROM_2000_2004.zip) | 1 KB | 10/01/2026 03:04:57 AM ET |
| [RCL\_FROM\_2005\_2009.zip](https://static.nhtsa.gov/odi/ffdd/rcl/RCL_FROM_2005_2009.zip) | 4 KB | 10/01/2026 03:04:57 AM ET |
| [RCL\_FROM\_2010\_2014.zip](https://static.nhtsa.gov/odi/ffdd/rcl/RCL_FROM_2010_2014.zip) | 112 KB | 10/01/2026 03:04:57 AM ET |
| [RCL\_FROM\_2015\_2019.zip](https://static.nhtsa.gov/odi/ffdd/rcl/RCL_FROM_2015_2019.zip) | 6 MB | 10/01/2026 03:04:57 AM ET |
| [RCL\_FROM\_2020\_2024.zip](https://static.nhtsa.gov/odi/ffdd/rcl/RCL_FROM_2020_2024.zip) | 4 MB | 10/01/2026 03:04:57 AM ET |
| [RCL\_FROM\_2025\_2025.zip](https://static.nhtsa.gov/odi/ffdd/rcl/RCL_FROM_2025_2025.zip) | 89 KB | 10/01/2026 03:04:57 AM ET |
| [RCL\_FROM\_2025\_2026.zip](https://static.nhtsa.gov/odi/ffdd/rcl/RCL_FROM_2025_2026.zip) | 90 KB | 10/01/2026 03:04:57 AM ET |
| [RCL\_Qtrly\_Rpts.txt](https://static.nhtsa.gov/odi/ffdd/rcl/RCL_Qtrly_Rpts.txt) | 1 KB | 10/01/2026 03:04:57 AM ET |
| [Recall\_Communications.pdf](https://static.nhtsa.gov/odi/ffdd/rcl/Recall_Communications.pdf) | 179 MB | 04/29/2025 05:01:20 AM ET |

You can also search recalls by date of when a recall was published, and filter by product type, on [NHTSA.gov](https://www.nhtsa.gov/node/33631).

# Investigations

After a preliminary review of consumer complaints and other information related to alleged defects, NHTSA obtains information from the manufacturer(including data on complaints, crashes, injuries, warranty claims, modifications, and part sales) and determines whether further analysis is warranted.  If warranted, the investigator will conduct a more detailed and complete analysis of the character and scope of the alleged defect.

## Download Data

Select the .zip file for the desired database to download and extract the data. See the corresponding.txt file for a description of the file layout. All times shown are Eastern Time (ET).

Hide lower priority columns

| Path | Size | Updated |
| --- | --- | --- |
|  |
| --- |
| [FLAT\_INV.zip](https://static.nhtsa.gov/odi/ffdd/inv/FLAT_INV.zip) | 4 MB | 10/01/2026 05:32:08 AM ET |
| [INV.txt](https://static.nhtsa.gov/odi/ffdd/inv/INV.txt) | 2 KB | 10/01/2026 05:32:09 AM ET |

## Monthly Reports

You can search investigations by the date of when a defect investigation was opened or closed on [NHTSA.gov](https://www.nhtsa.gov/node/33631).

# Complaints

Complaint information entered into NHTSA’s Office of Defects Investigation vehicle owner's complaint database is used with other data sources to identify safety issues that warrant investigation and to determine if a safety-related defect trend exists. Complaint information is also analyzed to monitor existing recalls for proper scope and adequacy.

## Metadata

#### Dataset Summary

Agency: **Department of Transportation**

Sub-Agency/Organization: **National Highway Traffic Safety Administration**

Category: 23, **Transportation**

Date Released: **December 16, 2002**

Time Period: **1949 to present**

Frequency: **Daily**

#### Dataset Information

Data.gov Data Category Type: **Raw data**

Specialized Data Category Designation: **Enforcement**

Keywords: **Phone, Paper, Email**

Unique ID: **81**

#### Contributing Agency Information

Citation: N/A

Agency Program Page: [https://www.nhtsa.gov/report-a-safety-problem](https://www.nhtsa.gov/report-a-safety-problem)

Agency Data Series Page: [https://static.nhtsa.gov/odi/ffdd/cmpl/FLAT\_CMPL.zip](https://static.nhtsa.gov/odi/ffdd/cmpl/FLAT_CMPL.zip)

#### Dataset Coverage

Unit of Analysis: **Vehicles, Tires, Child Safety Seats, Equipment**

Granularity: **United States**

Geographic Coverage: N/A

#### Data Description

Collection Mode: **Web, Phone**

Data Collection Instrument: N/A

Data Dictionary/Variable List: [https://static.nhtsa.gov/odi/ffdd/cmpl/CMPL.txt](https://static.nhtsa.gov/odi/ffdd/cmpl/CMPL.txt)

#### Dataset Quality

Data Quality Certification: **Yes**

Privacy and Confidentiality: **Yes**

Applicable Information Quality Guideline Designation: **National Highway Traffic Safety Administration**

#### Additional Dataset Documentation

Technical Documentation: [https://static.nhtsa.gov/odi/ffdd/cmpl/Import\_Instructions\_Excel\_All.pdf](https://static.nhtsa.gov/odi/ffdd/cmpl/Import_Instructions_Excel_All.pdf)

Additional Metadata: N/A

## API

#### Approach A: Get by Model Year, Make, Model

Make the request to get the complaints for the required combination of Model Year, Make and Model.

- Syntax: api.nhtsa.gov/complaints/complaintsByVehicle?make={MAKE}&model={MODEL}&modelYear={MODEL\_YR}
- Example: https://api.nhtsa.gov/complaints/complaintsByVehicle?make=acura&model=rdx&modelYear=2012

Response Fields: Response is a list of complaints for the given Model Year, Make and Model

Working Sample: [JSON](https://api.nhtsa.gov/complaints/complaintsByVehicle?make=acura&model=rdx&modelYear=2012)

* * *

#### Approach B: Get by Model Year, Make, Model

**Step 1: Get all Model Years**

Request a list of available Model Years for a given product type (Vehicle).

- Syntax: api.nhtsa.gov/products/vehicle/modelYears?issueType=c
- Example: https://api.nhtsa.gov/products/vehicle/modelYears?issueType=c

Response Fields: Response is a list of available Model Years in the repository. Use a Model Year from this list to use in the next step.

Working Sample: [JSON](https://api.nhtsa.gov/products/vehicle/modelYears?issueType=c)

**Step 2: Get all Makes for the Model Year**

Request a list of vehicle Makes by providing a specific vehicle Model Year.

- Syntax: api.nhtsa.gov/products/vehicle/makes?modelYear={year}&issueType=c
- Example: https://api.nhtsa.gov/products/vehicle/makes?modelYear=2021&issueType=c

Response Fields: Response is a list of vehicle Makes for that Model Year. Use the Model Year and a Make from this list to use in the next step.

Working Sample: [JSON](https://api.nhtsa.gov/products/vehicle/makes?modelYear=2021&issueType=c)

**Step 3: Get all Models for the Make and Model Year**

Request a list of vehicle Models by providing the vehicle Model Year and Make.

- Syntax: api.nhtsa.gov/products/vehicle/models?modelYear={year}&make={make}&issueType=c
- Example: https://api.nhtsa.gov/products/vehicle/models?modelYear=2010&make=acura&issueType=c

Working Sample: [JSON](https://api.nhtsa.gov/products/vehicle/models?modelYear=2010&make=acura&issueType=c)

**Step 4: Get all complaints for the selected Model Year, Make, Model**

Now that you have all three key pieces of information (Model Year, Make, Model), make the request to get the complaints for the required combination.

- Syntax: api.nhtsa.gov/complaints/complaintsByVehicle?make={MAKE}&model={MODEL}&modelYear={MODEL\_YR}
- Example: https://api.nhtsa.gov/complaints/complaintsByVehicle?make=acura&model=rdx&modelYear=2012

Response Fields: Response is a list of complaints for the given Model Year, Make and Model

Working Sample: [JSON](https://api.nhtsa.gov/complaints/complaintsByVehicle?make=acura&model=rdx&modelYear=2012)

* * *

#### Approach C: Get by ODI Number

Request a list of complaints by providing ODI number.

- Syntax: api.nhtsa.gov/complaints/odinumber?odinumber={odinumber}
- Example: https://api.nhtsa.gov/complaints/odinumber?odinumber=11184030

Response Fields: Response is a list of complaints for the specified ODI number.

Working Sample: [JSON](https://api.nhtsa.gov/complaints/odinumber?odinumber=11184030)

* * *

#### Notes

Color codes to understand each part of the request URL:

- Red: Method Name
- Green: Applicable parameters

Request parameters and method names are case sensitive

## Download Data

Single file of all Complaints

Hide lower priority columns

| Path | Size | Updated |
| --- | --- | --- |
|  |
| --- |
| [FLAT\_CMPL.zip](https://static.nhtsa.gov/odi/ffdd/cmpl/FLAT_CMPL.zip) | 234 MB | 09/30/2026 06:21:20 AM ET |
| [Import\_Instructions\_Excel\_All.pdf](https://static.nhtsa.gov/odi/ffdd/cmpl/Import_Instructions_Excel_All.pdf) | 672 KB | 02/28/2022 08:52:26 AM ET |

Five-year sets based on Received Date

Hide lower priority columns

| Path | Size | Updated |
| --- | --- | --- |
|  |
| --- |
| [COMPLAINTS\_RECEIVED\_2025-2026.zip](https://static.nhtsa.gov/odi/ffdd/cmpl/COMPLAINTS_RECEIVED_2025-2026.zip) | 39 MB | 10/01/2026 11:24:15 AM ET |
| [COMPLAINTS\_RECEIVED\_2020-2024.zip](https://static.nhtsa.gov/odi/ffdd/cmpl/COMPLAINTS_RECEIVED_2020-2024.zip) | 72 MB | 10/01/2026 11:23:15 AM ET |
| [COMPLAINTS\_RECEIVED\_2015-2019.zip](https://static.nhtsa.gov/odi/ffdd/cmpl/COMPLAINTS_RECEIVED_2015-2019.zip) | 78 MB | 09/25/2026 05:46:34 AM ET |
| [COMPLAINTS\_RECEIVED\_2010-2014.zip](https://static.nhtsa.gov/odi/ffdd/cmpl/COMPLAINTS_RECEIVED_2010-2014.zip) | 69 MB | 09/25/2026 05:43:55 AM ET |
| [COMPLAINTS\_RECEIVED\_2005-2009.zip](https://static.nhtsa.gov/odi/ffdd/cmpl/COMPLAINTS_RECEIVED_2005-2009.zip) | 44 MB | 09/30/2026 05:30:19 AM ET |
| [COMPLAINTS\_RECEIVED\_2000-2004.zip](https://static.nhtsa.gov/odi/ffdd/cmpl/COMPLAINTS_RECEIVED_2000-2004.zip) | 40 MB | 09/25/2026 05:40:32 AM ET |
| [COMPLAINTS\_RECEIVED\_1995-1999.zip](https://static.nhtsa.gov/odi/ffdd/cmpl/COMPLAINTS_RECEIVED_1995-1999.zip) | 14 MB | 09/14/2026 09:42:24 AM ET |
| [Import\_Instructions\_Excel\_5-year.pdf](https://static.nhtsa.gov/odi/ffdd/cmpl/Import_Instructions_Excel_5-year.pdf) | 604 KB | 02/28/2022 08:52:25 AM ET |
| [Import\_Instructions\_Access.pdf](https://static.nhtsa.gov/odi/ffdd/cmpl/Import_Instructions_Access.pdf) | 973 KB | 02/28/2022 08:52:25 AM ET |
| [CMPL.txt](https://static.nhtsa.gov/odi/ffdd/cmpl/CMPL.txt) | 10 KB | 05/01/2026 09:46:45 AM ET |

# Manufacturer Communications

All manufacturers of motor vehicles or motor vehicle equipment, including low volume and child restraints, must submit to NHTSA copies of their manufacturer communications sent to dealers, distributors, owners, purchasers, lessors, or lessees regarding any defect, failure or malfunction beyond normal deterioration in use, failure of performance, flaw or other unintended deviation from design specifications whether it is safety-related or not.

### Recent Changes

On September 24, 2026, the following changes were made to the Manufacturer Communications dataset.

- Field #12: Mfr Component System

Current: CHAR(256) → New: CHAR(512)

Description: Manufacturer's top-level component of the products involved in communications.
- Field #13: Mfr Component Subsystem

Current: CHAR(256) → New: CHAR(512)

Description: Manufacturer's component subsystem of the top-level component identified above.

## Download Data

Select the .zip file for the desired database to download and extract the data. See the corresponding.txt file for a description of the file layout. All times shown are Eastern Time (ET).

Hide lower priority columns

| Path | Size | Updated |
| --- | --- | --- |
|  |
| --- |
| [MFR\_COMMS\_RECEIVED\_1995-1999.zip](https://static.nhtsa.gov/odi/ffdd/tsbs/MFR_COMMS_RECEIVED_1995-1999.zip) | 631 KB | 10/01/2026 06:04:19 AM ET |
| [MFR\_COMMS\_RECEIVED\_2000-2004.zip](https://static.nhtsa.gov/odi/ffdd/tsbs/MFR_COMMS_RECEIVED_2000-2004.zip) | 2 MB | 10/01/2026 06:04:19 AM ET |
| [MFR\_COMMS\_RECEIVED\_2005-2009.zip](https://static.nhtsa.gov/odi/ffdd/tsbs/MFR_COMMS_RECEIVED_2005-2009.zip) | 884 KB | 10/01/2026 06:04:18 AM ET |
| [MFR\_COMMS\_RECEIVED\_2010-2014.zip](https://static.nhtsa.gov/odi/ffdd/tsbs/MFR_COMMS_RECEIVED_2010-2014.zip) | 2 MB | 10/01/2026 06:04:20 AM ET |
| [MFR\_COMMS\_RECEIVED\_2015-2019.zip](https://static.nhtsa.gov/odi/ffdd/tsbs/MFR_COMMS_RECEIVED_2015-2019.zip) | 13 MB | 10/01/2026 06:05:02 AM ET |
| [MFR\_COMMS\_RECEIVED\_2020-2024.zip](https://static.nhtsa.gov/odi/ffdd/tsbs/MFR_COMMS_RECEIVED_2020-2024.zip) | 11 MB | 10/01/2026 06:04:57 AM ET |
| [MFR\_COMMS\_RECEIVED\_2025-2025.zip](https://static.nhtsa.gov/odi/ffdd/tsbs/MFR_COMMS_RECEIVED_2025-2025.zip) | 3 MB | 12/31/2025 06:04:04 AM ET |
| [MFR\_COMMS\_RECEIVED\_2025-2026.zip](https://static.nhtsa.gov/odi/ffdd/tsbs/MFR_COMMS_RECEIVED_2025-2026.zip) | 5 MB | 10/01/2026 06:04:27 AM ET |
| [TSBS.txt](https://static.nhtsa.gov/odi/ffdd/tsbs/TSBS.txt) | 6 KB | 09/25/2026 06:57:23 AM ET |
| [TSBS\_RECEIVED\_1995-1999.zip](https://static.nhtsa.gov/odi/ffdd/tsbs/TSBS_RECEIVED_1995-1999.zip) | 1 MB | 10/01/2026 06:04:27 AM ET |
| [TSBS\_RECEIVED\_2000-2004.zip](https://static.nhtsa.gov/odi/ffdd/tsbs/TSBS_RECEIVED_2000-2004.zip) | 3 MB | 10/01/2026 06:04:29 AM ET |
| [TSBS\_RECEIVED\_2005-2009.zip](https://static.nhtsa.gov/odi/ffdd/tsbs/TSBS_RECEIVED_2005-2009.zip) | 2 MB | 10/01/2026 06:04:29 AM ET |
| [TSBS\_RECEIVED\_2010-2014.zip](https://static.nhtsa.gov/odi/ffdd/tsbs/TSBS_RECEIVED_2010-2014.zip) | 4 MB | 10/01/2026 06:04:43 AM ET |
| [TSBS\_RECEIVED\_2015-2019.zip](https://static.nhtsa.gov/odi/ffdd/tsbs/TSBS_RECEIVED_2015-2019.zip) | 31 MB | 10/01/2026 06:10:14 AM ET |
| [TSBS\_RECEIVED\_2020-2024.zip](https://static.nhtsa.gov/odi/ffdd/tsbs/TSBS_RECEIVED_2020-2024.zip) | 30 MB | 10/01/2026 06:10:45 AM ET |
| [TSBS\_RECEIVED\_2025-2025.zip](https://static.nhtsa.gov/odi/ffdd/tsbs/TSBS_RECEIVED_2025-2025.zip) | 6 MB | 12/31/2025 06:04:41 AM ET |
| [TSBS\_RECEIVED\_2025-2026.zip](https://static.nhtsa.gov/odi/ffdd/tsbs/TSBS_RECEIVED_2025-2026.zip) | 11 MB | 10/01/2026 06:06:16 AM ET |

# Car Seat Inspection Locator

Car crashes are a leading cause of death and injuries for children. Data show a high number of child car seats are not installed properly. Car seat inspection stations make it easier for parents and caregivers to check to see if their car seat is installed correctly. NHTSA provides information to help people locate a car seat inspection station. Information for each station is reported to NHTSA and we attempt to validate the station locations using a commercial geographic database so that this data will, in most cases, be able to be used for driving directions.

## Metadata

#### Dataset Summary

Agency: **Department of Transportation**

Sub-Agency/Organization: **National Highway Traffic Safety Administration**

Category: 23, **Transportation**

Date Released: **November 5, 2021**

Time Period: **Current**

Frequency: **Annual**

#### Dataset Information

Data.gov Data Category Type: **Raw data**

Specialized Data Category Designation: **Research**

Keywords: **Child Seat, Safety, Inspection, Stations, Station**

Unique ID: **80**

#### Contributing Agency Information

Agency program page: [www.nhtsa.gov/equipment/car-seats-and-booster-seats#installation-help-inspection](https://www.nhtsa.gov/equipment/car-seats-and-booster-seats#installation-help-inspection)

#### Dataset Coverage

Unit of Analysis: N/A

Granularity: Nationwide, including Territories

Geographic Coverage: Zip, State, Geo Coordinates

#### Dataset Quality

Data Quality Certification: No

Privacy and Confidentiality: No

Applicable Information Quality Guideline Designation: **National Highway Traffic Safety Administration**

## API

#### Approach A. Get by ZIP Code

Make the request with a ZIP code to get the list of CSSIStations at the specific ZIP code only (nearby ZIP codes are not included).

- /CSSIStation/zip/63640

Response Fields: Response is a list of CSSIStations for a given ZIP code.

Working Sample: [JSON](https://api.nhtsa.gov/CSSIStation/zip/63640)

* * *

#### Approach B. Get by State

Make the request with the state abbreviation to get the list of CSSIStations in that state only.

- /api/CSSIStation/state/NV

Response Fields: Response is a list of CSSIStations in a given state.

Working Sample: [JSON](https://api.nhtsa.gov/CSSIStation/state/NV)

* * *

#### Approach C. Get by Geo Location

Make the request with an interested latitude and longitude location along with the miles nearby to look out for CSSIStations.

- /CSSIStation?lat=30.1783&long=-96.3911&miles=50

Response Fields: Response is a list of CSSIStations nearby the interested geographical location spotted by its latitude and longitude.

Working Sample: [JSON](https://api.nhtsa.gov/CSSIStation?lat=30.1783&long=-96.3911&miles=50)

* * *

#### Filters. Optional Filters

**Filter 1: Filter by Spanish-Speaking Stations**

Make the request with a ZIP code/state/geographical location to get the list of CSSIStations filtered by spanish speaking (attach string - /lang/spanish) and stations participating in CPSWeek event (attach string - /cpsweek). Below filters in the request string are optional, either one/none OR both can be sent in.

- /CSSIStation/zip/67951/lang/spanish

Response Fields: Response is a list of CSSIStations for a given ZIP code applying the respective filter.

Working Sample: [JSON](https://api.nhtsa.gov//CSSIStation/zip/67951/lang/spanish)

**Filter 2: Filter by Stations participating in CPS Week**

Make the request with a ZIP code/state/geographical location to get the list of CSSIStations filtered by stations participating in CPSWeek event (attach string - /cpsweek). Below filters in the request string are optional, either one/none OR both can be sent in.

- /CSSIStation/zip/37066/cpsweek

Response Fields: Response is a list of CSSI Stations for a given ZIP code applying the respective filter.

Working Sample: [JSON](https://api.nhtsa.gov/CSSIStation/zip/37066/cpsweek)

* * *

#### Notes

Color codes to understand each part of the request URL:

- Red: Method Name
- Green: Applicable parameters
- Orange: Extended parameters

Request parameters and method names are case-sensitive.

[Go to top of page](https://www.nhtsa.gov/nhtsa-datasets-and-apis#site-wrapper)