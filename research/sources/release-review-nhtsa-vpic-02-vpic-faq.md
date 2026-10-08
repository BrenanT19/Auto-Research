Source: https://vpic.nhtsa.dot.gov/api/home/index/faq
Title: Vehicle API
Fetched: 2026-10-08T02:35:43.495Z

### [Vehicle API\  Powered by ![](https://vpic.nhtsa.dot.gov/api/images/vpic-small.png)](https://vpic.nhtsa.dot.gov/api/Home)

Version: 4.06 Last Code Change 6/13/2026

[Release Notes](https://vpic.nhtsa.dot.gov/api/Home/Index/ReleaseNotes "Release Notes") [Subscribe/Unsubscribe](https://vpic.nhtsa.dot.gov/mfrportal/EmailSubscription/Manage "Subscribe/Unsubscribe") [F.A.Q.](https://vpic.nhtsa.dot.gov/api/home/index/faq "Frequently Asked Questions")

## Frequently Asked Questions

API Uptime:

- The vPIC API is up 24/7 minus an occasional need for maintenance. We strive for a 99% availability during normal business hours, which are 6AM EST – 6PM EST. Maintenance periods are typically scheduled for the weekend if there is a need.


Foreign Vehicle Information:


- Registration of vehicles for importation, use and / or sale are included within vPIC. What this means is that there is information on vehicles within the dataset with regards to foreign vehicles provided that the manufacturers registered with the intention of having them be sold, used and or registered within the United States. If they did not register with vPIC in this fashion through the 565 process then we would not have the data. In addition, we do require that vehicles comply with the minimum safety requirements for the US, which is why some manufacturers may never register, as they do not meet the requirements for importation, use and or sale.


Body Class Images:


- You can download all the available body class images [here](https://vpic.nhtsa.dot.gov/api/Content/BodyClassImages.zip?x=240918).


General API Information:


- Is there a licensing requirement or registration requirement to use the APIs?  - No, NHTSA is a government agency and the services provided on the API are free for use by the public as an offering as a part of our Open Data initiatives; and

  - There is **no need to register your application** to use the services
- Is there a limit on the amount of queries that can be made to the Vehicle API actions per day?
   - No there is no limit to the amount of actions that can be run on the API per day

  - This said, this is a public resource so if you are planning on large batch processes we ask that you time them either at night (based on EST, or on the weekend).

  - During the normal week, we can easily handle between 1000 – 2000 transactions / minute on the servers. We have not reached an upper limit at this time.

  - For the ‘Decode VIN (flat format) in a Batch’ is there a sample on making this query by URL, similar to the other actions?

  - For this particular API you just have to put a set of VINs within the box that are separated by a “;”. You can also indicate the model year prior to the “;” separated by a “,”

  - Example in the box is basically what you need to do: 5UXWX7C5\*BA,2011; 5YJSA3DS\*EF

  - This said, there is an upper limit on the number of VINs you can put through this service, as it will bog down.
    - We encourage you to use a programmed routine on the standard decode APIs at the top of the page if you are running a bunch of VINs.
- Found a discrepancy on a VIN, how are corrections reconciled?
   - We are asking the users for feedback on issues that they may find with the data;

  - We will take an action to follow up on the errors, which can / may include contacting the manufacturers to get correct information

  - General Use Parameters / Limits:
    - We have confidence at about a 99% rate of being able to decode from Model Year 1995 forward for most major brands and most odd vehicles. This said, if you see something missing in this range please let us know.

    - From 1980 – 1994 we have a lower confidence of being able to decode, but we are improving this confidence rate every day. I would say we are in the 60-65% range for vehicles within the 1980-1994 range for being able to decode, as this was not our first area of focus.

    - Prior to 1980 we do not have data in vPIC as the VIN standard was not established in the United States and manufacturers prior to this period were free to apply their own identification numbers.
- Is there a way to be informed about the changes that occur in the system?
   - We have many public customers now on vPIC and from a user standpoint we wanted to make sure that folks understand any changes that occur in the system. So, we created a vPIC subscription service that sends the persons that subscribe the release notes as they come out. We thought it was a nice way of ensuring developers and heavy users are up on the latest features. The option is at the top of each of our vPIC modules. If you would like to subscribe you can. Also, you have the option to remove yourself the way other services like this work.