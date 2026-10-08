Source: https://vpic.nhtsa.dot.gov/api
Title: Vehicle API
Fetched: 2026-10-08T04:58:12.632Z

### [Vehicle API\  Powered by ![](https://vpic.nhtsa.dot.gov/api/images/vpic-small.png)](https://vpic.nhtsa.dot.gov/api/Home)

Version: 4.06 Last Code Change 6/13/2026

[Release Notes](https://vpic.nhtsa.dot.gov/api/Home/Index/ReleaseNotes "Release Notes") [Subscribe/Unsubscribe](https://vpic.nhtsa.dot.gov/mfrportal/EmailSubscription/Manage "Subscribe/Unsubscribe") [F.A.Q.](https://vpic.nhtsa.dot.gov/api/home/index/faq "Frequently Asked Questions")

The NHTSA Product Information Catalog Vehicle Listing (vPIC) Application Programming Interface (API) provides different ways to gather information on Vehicles and their specifications. The vPIC Dataset is populated using the information submitted by the Motor Vehicle manufacturers through the 565 submittals. All the information on how a VIN is assigned by the manufacturer is captured in this catalog and used to decode a VIN and extract vehicle information.


Users/Applications attempting to use vPIC APIs will be controlled by an automated traffic rate control mechanism to ensure optimal performance of the NHTSA websites and minimize adverse impact to our users.

[Click here to see examples in Multiple Languages](https://vpic.nhtsa.dot.gov/api/Home/Index/LanguageExamples).


### Standalone Databases

Standalone vPIC Databases are available for [download here](https://vpic.nhtsa.dot.gov/downloads/).


### API Methods

### Output Format

#### Decode VIN

`/vehicles/DecodeVin/5UXWX7C5*BA?format=xml&modelyear=2011`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/5UXWX7C5*BA?format=xml&modelyear=2011) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/5UXWX7C5*BA?format=csv&modelyear=2011) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/5UXWX7C5*BA?format=json&modelyear=2011)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

The Decode VIN API will decode the VIN and the decoded output will be made available in the format of Key-value pairs.
The IDs (VariableID and ValueID) represent the unique ID associated with the Variable/Value.
In case of text variables, the ValueID is not applicable.
Model Year in the request allows for the decoding to specifically be done in the current, or older (pre-1980),
model year ranges. It is recommended to always send in the model year.
This API also supports partial VIN decoding (VINs that are less than 17 characters).
In this case, the VIN will be decoded partially with the available characters. In case of partial VINs,
a "\*" could be used to indicate the unavailable characters. The 9th digit is not necessary.


#### Decode VIN (flat format)

`/vehicles/DecodeVinValues/5UXWX7C5*BA?format=xml&modelyear=2011`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/5UXWX7C5*BA?format=xml&modelyear=2011) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/5UXWX7C5*BA?format=csv&modelyear=2011) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/5UXWX7C5*BA?format=json&modelyear=2011)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

The Decode VIN Flat Format API will decode the VIN and the decoded output will be made available in a flat file format.
Model Year in the request allows for the decoding to specifically be done in the current, or older (pre-1980),
model year ranges. It is recommended to always send in the model year.
This API also supports partial VIN decoding (VINs that are less than 17 characters).
In this case, the VIN will be decoded partially with the available characters. In case of partial VINs,
a "\*" could be used to indicate the unavailable characters.


#### Decode VIN Extended

`/vehicles/DecodeVinExtended/5UXWX7C5*BA?format=json&modelyear=2011`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/decodevinextended/5UXWX7C5*BA?format=xml&modelyear=2011) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/decodevinextended/5UXWX7C5*BA?format=csv&modelyear=2011) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/decodevinextended/5UXWX7C5*BA?format=json&modelyear=2011)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This is exactly like the Decode VIN method but provides additional information on variables
related to other NHTSA programs like NCSA etc.


#### Decode VIN Extended (flat format)

`/vehicles/DecodeVinValuesExtended/5UXWX7C5*BA?format=json&modelyear=2011`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvaluesextended/5UXWX7C5*BA?format=xml&modelyear=2011) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvaluesextended/5UXWX7C5*BA?format=csv&modelyear=2011) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvaluesextended/5UXWX7C5*BA?format=json&modelyear=2011)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This is exactly like the Decode VIN (flat format) method but provides additional information on variables
related to other NHTSA programs like NCSA etc.


#### Decode WMI

`/vehicles/DecodeWMI/1FD?format=xml`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/decodewmi/1FD?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/decodewmi/1FD?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/decodewmi/1FD?format=json)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This provides information on the World Manufacturer Identifier for a specific WMI code.
WMIs may be put in as either 3 characters representing VIN position 1-3 or 6 characters representing VIN positions 1-3 & 12-14.
Example "JTD", "1T9131".


#### Get WMIs for Manufacturer

`/vehicles/GetWMIsForManufacturer/hon?format=xml`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetWMIsForManufacturer/hon?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetWMIsForManufacturer/hon?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetWMIsForManufacturer/hon?format=json)

`/vehicles/GetWMIsForManufacturer/987?format=xml`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetWMIsForManufacturer/987?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetWMIsForManufacturer/987?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetWMIsForManufacturer/987?format=json)

`/vehicles/GetWMIsForManufacturer/hon?vehicleType=car&format=xml`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetWMIsForManufacturer/hon?vehicleType=car&format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetWMIsForManufacturer/hon?vehicleType=car&format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetWMIsForManufacturer/hon?vehicleType=car&format=json)

`/vehicles/GetWMIsForManufacturer/987?vehicleType=2&format=xml`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetWMIsForManufacturer/987?vehicleType=2&format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetWMIsForManufacturer/987?vehicleType=2&format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetWMIsForManufacturer/987?vehicleType=2&format=json)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

Provides information on the all World Manufacturer Identifier (WMI) for a specified Manufacturer. Only WMI registered in vPICList are displayed.


If first parameter is a number - method will do exact match on Manufacturer's Id.


If first parameter is a string - it will look for manufacturers whose name is LIKE the provided name (it accepts a partial manufacturer name as an input). Multiple results are returned in case of multiple matches.


If VehicleType is a number - method will do exact match on VehicleType's Id.


If VehicleType is a string - it will look for VehicleType whose name is LIKE the provided name (it accepts a partial VehicleType name as an input). Multiple results are returned in case of multiple matches.


Both parameters are optional but at least one must be provided.


#### Get All Makes

`/vehicles/GetAllMakes?format=csv`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=XML) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This provides a list of all the Makes available in vPIC Dataset.


#### Get Parts

`/vehicles/GetParts?type=565&fromDate=1/1/2015&toDate=5/5/2015&format=xml&page=1`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetParts?type=565&fromDate=1/1/2015&toDate=5/5/2015&format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetParts?type=565&fromDate=1/1/2015&toDate=5/5/2015&format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetParts?type=565&fromDate=1/1/2015&toDate=5/5/2015&format=json)

`/vehicles/GetParts?type=565&fromDate=1/1/2015&toDate=5/5/2015&format=xml&page=1&manufacturer=hon`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetParts?type=565&fromDate=1/1/2015&toDate=5/5/2015&format=xml&manufacturer=hon) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetParts?type=565&fromDate=1/1/2015&toDate=5/5/2015&format=csv&manufacturer=hon) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetParts?type=565&fromDate=1/1/2015&toDate=5/5/2015&format=json&manufacturer=hon)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This provides a list of ORGs with letter date in the given range of the dates and with specified Type of ORG. Up to 1000 results will be returned at a time.

Input:


typenumber, 565 (Vehicle Identification Number Guidance, based on 49 CFR Part 565) or 566 (Manufacturer Identification – Reporting Requirements based on 49 CFR Part 566)fromDate(optional) ORG's Letter Date should be on or after this datetoDate(optional) ORG's Letter Date should be on or before this datemanufacturer
(optional) if supplied value is a number - method will do exact match on Manufacturer's Id.


if supplied value is a string - it will look for manufacturers whose name is LIKE the provided name (it accepts a partial manufacturer name as an input). Multiple results are returned in case of multiple matches.


Manufacturer name can be a partial name, or a full name for more specificity (e.g., "988", "HONDA", "HONDA OF CANADA MFG., INC.", etc.)
format(optional) string, can be 'xml' (default), 'csv' or 'json'page(optional) number, 1 (default) first 1000 records, 2 - next 1000 records, ...

#### Get All Manufacturers

`/vehicles/GetAllManufacturers?format=xml&page=2`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/getallmanufacturers?format=XML&page=2) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/getallmanufacturers?format=CSV&page=2) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/getallmanufacturers?format=json&page=2)

`/vehicles/GetAllManufacturers?ManufacturerType=Intermediate&page=2`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/getallmanufacturers?ManufacturerType=Intermediate&format=XML&page=2) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/getallmanufacturers?ManufacturerType=Intermediate&format=CSV&page=2) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/getallmanufacturers?ManufacturerType=Intermediate&format=json&page=2)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

Returns a list of all the Manufacturers available in vPIC Dataset. It can be filtered by Manufacturer Type (optional) by using a full name or any part of it.

Results are provided in pages of 100 items, use parameter "page" to specify 1-st (default), 2nd, 3rd, ...Nth ... page.

Manufacturer Type


2Completed Vehicle Manufacturer3Incomplete Vehicle Manufacturer4Intermediate Vehicle Manufacturer5Final-Stage Vehicle Manufacturer6Vehicle Alterer7Fabricating Manufacturer of Motor Vehicle Equipment8Importer of Motor Vehicle Equipment9Importer of Motor Vehicles Originally Manufactured to Conform to FMVSS10Replica Vehicle Manufacturer

#### Get Manufacturer Details

`/vehicles/GetManufacturerDetails/honda?format=xml`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/getmanufacturerdetails/honda?format=XML) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/getmanufacturerdetails/honda?format=CSV) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/getmanufacturerdetails/honda?format=json)

`/vehicles/GetManufacturerDetails/str?page=2`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/getmanufacturerdetails/str?page=2&format=XML) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/getmanufacturerdetails/str?page=2&format=CSV) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/getmanufacturerdetails/str?page=2&format=json)

`/vehicles/GetManufacturerDetails/989`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/getmanufacturerdetails/989?format=XML) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/getmanufacturerdetails/989?format=CSV) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/getmanufacturerdetails/989?format=json)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This provides the details for a specific manufacturer(s).


If supplied parameter is a number - method will do exact match on Manufacturer's Id and return exactly one record.

If supplied parameter is a string - it will look for manufacturers whose name is LIKE the provided name (it accepts a partial manufacturer name as an input). Multiple results are returned in case of multiple matches.
In this case, results are provided in pages of 100 items, use parameter "page" to specify 1-st (default), 2nd, 3rd, ...Nth ... page.


#### Get Makes for Manufacturer by Manufacturer Name

`/vehicles/GetMakeForManufacturer/honda?format=json`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetMakeForManufacturer/honda?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetMakeForManufacturer/honda?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetMakeForManufacturer/honda?format=json)

`/vehicles/GetMakeForManufacturer/988?format=xml`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetMakeForManufacturer/988?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetMakeForManufacturer/988?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetMakeForManufacturer/988?format=json)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This returns all the Makes in the vPIC dataset for a specified manufacturer that is requested.


If supplied parameter is a number - method will do exact match on Manufacturer's Id.


If supplied parameter is a string - it will look for manufacturers whose name is LIKE the provided name (it accepts a partial manufacturer name as an input). Multiple results are returned in case of multiple matches.


Manufacturer name can be a partial name, or a full name for more specificity (e.g., "988", "HONDA", "HONDA OF CANADA MFG., INC.", etc.)


#### Get Makes for Manufacturer by Manufacturer Name and Year

`/vehicles/GetMakesForManufacturerAndYear/mer?year=2013&format=json`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForManufacturerAndYear/mer?year=2014&format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForManufacturerAndYear/mer?year=2014&format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForManufacturerAndYear/mer?year=2014&format=json)

`/vehicles/GetMakesForManufacturerAndYear/988?year=2013&format=json`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForManufacturerAndYear/988?year=2014&format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForManufacturerAndYear/988?year=2014&format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForManufacturerAndYear/988?year=2014&format=json)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This returns all the Makes in the vPIC dataset for a specified manufacturer and
whose Year From and Year To range cover the specified year


If supplied parameter is a number - method will do exact match on Manufacturer's Id.


If supplied parameter is a string - it will look for manufacturers whose name is LIKE the provided name (it accepts a partial manufacturer name as an input). Multiple results are returned in case of multiple matches.


Manufacturer can be idenfitied by Id, a partial name, or a full name (e.g., "988", "HONDA", "HONDA OF CANADA MFG., INC.", etc.)


#### Get Makes for Vehicle Type by Vehicle Type Name

`/vehicles/GetMakesForVehicleType/car?format=json`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This returns all the Makes in the vPIC dataset for a specified vehicle type whose name is LIKE the vehicle type name in vPIC Dataset.


Vehicle Type name can be a partial name, or a full name for more specificity (e.g., "Vehicle", "Moto", "Low Speed Vehicle", etc.)


#### Get Vehicle Types for Make by Name

`/vehicles/GetVehicleTypesForMake/mercedes?format=json`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetVehicleTypesForMake/merc?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetVehicleTypesForMake/merc?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetVehicleTypesForMake/merc?format=json)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This returns all the Vehicle Types in the vPIC dataset for a specified Make whose name is LIKE the make name in vPIC Dataset.
Make name can be a partial name, or a full name for more specificity (e.g., "Merc", "Mercedes Benz", etc.)


#### Get Vehicle Types for Make by Id

`/vehicles/GetVehicleTypesForMakeId/450?format=json`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetVehicleTypesForMakeId/450?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetVehicleTypesForMakeId/450?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetVehicleTypesForMakeId/450?format=json)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This returns all the Vehicle Types in the vPIC dataset for a specified Make whose ID equals the make ID in vPIC Dataset.


#### Get Equipment Plant Codes

`/vehicles/GetEquipmentPlantCodes/2015?format=json`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetEquipmentPlantCodes?year=2015&equipmentType=1&reportType=all&format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetEquipmentPlantCodes?year=2015&equipmentType=1&reportType=all&format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetEquipmentPlantCodes?year=2015&equipmentType=1&reportType=all&format=json)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

Returns assigned Equipment Plant Codes. Can be filtered by Year, Equipment Type and Report Type.

Year


2016Only years 2016 and above are supported

Equipment Type


1Tires3Brake Hoses13Glazing16Retread

Report Type


NewThe Equipment Plant Code was assigned during the selected yearUpdatedThe Equipment Plant data was modified during the selected yearClosedThe Equipment Plant is no longer ActiveAllAll Equipment Plant Codes regardless of year, including their status (active or closed)

#### Get Models for Make

`/vehicles/GetModelsForMake/honda?format=json`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/honda?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/honda?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/honda?format=json)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This returns the Models in the vPIC dataset for a specified Make whose name is LIKE the Make in vPIC Dataset.


Input:


MakeName
string, 'honda' in the example(s) above (/vehicles/GetModelsForMake/ **honda**?format=json)


\- can be a partial or a full name for more specificity (e.g., "Harley", "Harley Davidson", etc.)


\- `*` (star, or multiplication sign) can be used instead to return Models for ALL Makes - WARNING: this can be slow!
format(optional) string, can be 'xml' (default), 'csv' or 'json'

#### Get Models for MakeId

`/vehicles/GetModelsForMakeId/440?format=json`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeId/440?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeId/440?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeId/440?format=json)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This returns the Models in the vPIC dataset for a specified Make whose Id is EQUAL the MakeId in vPIC Dataset.


Input:


MakeId
int, '440' in the example(s) above (/vehicles/GetModelsForMakeId/ **440**?format=json)


\- has to be EQUAL the MakeId in vPIC Dataset


\- 0 (zero) can be used instead to return Models for ALL Makes - WARNING: this can be slow!
format(optional) string, can be 'xml' (default), 'csv' or 'json'

#### Get Models for Make and a combination of Year and Vehicle Type

`/vehicles/GetModelsForMakeYear/make/honda/modelyear/2015?format=csv`

`/vehicles/GetModelsForMakeYear/make/honda/vehicletype/truck?format=csv`

`/vehicles/GetModelsForMakeYear/make/honda/modelyear/2015/vehicletype/truck?format=csv`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformakeyear/make/honda/modelyear/2015?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformakeyear/make/honda/modelyear/2015?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformakeyear/make/honda/modelyear/2015?format=json)

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformakeyear/make/honda/vehicleType/truck?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformakeyear/make/honda/vehicleType/truck?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformakeyear/make/honda/vehicleType/truck?format=json)

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformakeyear/make/honda/modelyear/2015/vehicleType/truck?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformakeyear/make/honda/modelyear/2015/vehicleType/truck?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformakeyear/make/honda/modelyear/2015/vehicleType/truck?format=json)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This returns the Models in the vPIC dataset for a specified year and Make whose name is LIKE the Make in vPIC Dataset.


Make can be a partial, or a full for more specificity (e.g., "Harley", "Harley Davidson", etc.)


ModelYear is integer (greater than 1995)


Vehicle Type name can be a partial name, or a full name for more specificity (e.g., "Vehicle", "Moto", "Low Speed Vehicle", etc.)


#### Get Models for Make Id and a combination of Year and Vehicle Type

`/vehicles/GetModelsForMakeIdYear/makeId/474/modelyear/2015?format=csv`

`/vehicles/GetModelsForMakeIdYear/makeId/474/vehicletype/truck?format=csv`

`/vehicles/GetModelsForMakeIdYear/makeId/474/modelyear/2015/vehicletype/truck?format=csv`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/474/modelyear/2015?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/474/modelyear/2015?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/474/modelyear/2015?format=json)

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/474/vehicleType/truck?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/474/vehicleType/truck?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/474/vehicleType/truck?format=json)

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/474/modelyear/2015/vehicleType/truck?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/474/modelyear/2015/vehicleType/truck?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/474/modelyear/2015/vehicleType/truck?format=json)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This returns the Models in the vPIC dataset for a specified year and Make whose Id is EQUAL the MakeId in vPIC Dataset.


MakeId is integer


ModelYear is integer (greater than 1995)


Vehicle Type name can be a partial name, or a full name for more specificity (e.g., "Vehicle", "Moto", "Low Speed Vehicle", etc.)


#### Get Vehicle Variables List

`/vehicles/GetVehicleVariableList?format=xml`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/getvehiclevariablelist?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/getvehiclevariablelist?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/getvehiclevariablelist?format=json)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This provides a list of all the Vehicle related variables that are in vPIC dataset.
Information on the name, description and the type of the variable is provided.


#### Get Vehicle Variable Values List

`/vehicles/GetVehicleVariableValuesList/battery type`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/getvehiclevariablevalueslist/battery%20type?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/getvehiclevariablevalueslist/battery%20type?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/getvehiclevariablevalueslist/battery%20type?format=json)

`/vehicles/GetVehicleVariableValuesList/2`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/getvehiclevariablevalueslist/2?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/getvehiclevariablevalueslist/2?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/getvehiclevariablevalueslist/2?format=json)

`/vehicles/GetVehicleVariableValuesList/Error Code`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/getvehiclevariablevalueslist/Error%20Code?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/getvehiclevariablevalueslist/Error%20Code?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/getvehiclevariablevalueslist/Error%20Code?format=json)

`/vehicles/GetVehicleVariableValuesList/143`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/getvehiclevariablevalueslist/143?format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/getvehiclevariablevalueslist/143?format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/getvehiclevariablevalueslist/143?format=json)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This provides a list of all the accepted values for a given variable that are stored in vPIC dataset.


Search parameter can either be a Variable Name ("battery type" in first example, please use full name, not just part of it), or Variable ID ("2" in second example).


This applies to only "Look up" type of variables.


#### Decode VIN (flat format) in a Batch (max 50 VINs per batch)

`/vehicles/DecodeVINValuesBatch/`

XML CSV JSON

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

This decodes a batch of VINs that are submitted in a standardized format in a string to return multiple decodes in a flat format.
The input string should be in the following format


> vin , modelYear ; vin , modelYear ; vin , modelYear ...

"modelYear" is optional, the output for each VIN decode is in the same format as produced by the "Decode VIN (flat format)" method.


#### Get Canadian vehicle specifications

`/vehicles/GetCanadianVehicleSpecifications/?year=2011&make=Acura&format=csv`

[XML](https://vpic.nhtsa.dot.gov/api/vehicles/GetCanadianVehicleSpecifications/?Year=2011&Make=Acura&Model=&units=&format=xml) [CSV](https://vpic.nhtsa.dot.gov/api/vehicles/GetCanadianVehicleSpecifications/?Year=2011&Make=Acura&Model=&units=&format=csv) [JSON](https://vpic.nhtsa.dot.gov/api/vehicles/GetCanadianVehicleSpecifications/?Year=2011&Make=Acura&Model=&units=&format=json)

[More Information](https://vpic.nhtsa.dot.gov/api/#) [Less Information](https://vpic.nhtsa.dot.gov/api/#)

The Canadian Vehicle Specifications (CVS) consists of a database of original vehicle dimensions, used primarily in collision investigation and reconstruction, combined with a search engine. The database is compiled annually by the Collision Investigation and Research Division of Transport Canada.


Visit official [Canadian Vehicle Specifications](http://www.carsp.ca/research/resources/safety-sources/canadian-vehicle-specifications/) page for more details.


Input:


yearNumber, >= 1971MakeVehicle's make, like "Honda", "Toyota" ...Model(optional) Vehicle's model, like "Pilot", "Focus" ... can include some other elements like Body Type, Engine Model/size ... Units
(optional) "Metric" (default), or
"US" for United States customary units


Output:

| Dimension | Description | Unit |
| --- | --- | --- |
| MAKE | Vehicle Make |  |
| MODEL | Vehicle Model |  |
| MYR | Signifies last two digits of the year in which the data was compiled for that specific model |  |
| A | Longitudinal distance between the center of the front bumper and the center of the base of the windshield | cm / inch |
| B | Passenger Car: Longitudinal distance between the center of the rear bumper and the center of the base of the backlight<br> <br>Station Wagon and Vans: Longitudinal distance between the backlight top moulding and the front door latch pillar<br> <br>Pick-ups: Longitudinal distance between the rearmost projection and the front door latch pillar | cm / inch |
| C | The maximum vertical height of the side glass | cm / inch |
| D | Vertical distance between the base of the side glass and the lower edge of the rocker panel | cm / inch |
| E | Distance between side rails or maximum width of top | cm / inch |
| F | Front overhang | cm / inch |
| G | Rear overhang | cm / inch |
| OL | Overall length | cm / inch |
| OW | Overall width | cm / inch |
| OH | Overall height | cm / inch |
| WB | Wheelbase | cm / inch |
| TWF | Front track width | cm / inch |
| TWR | Rear track width | cm / inch |
| CW | Curb weight | kg / lb |
| WD | Weight distribution (Front/Rear) | % |