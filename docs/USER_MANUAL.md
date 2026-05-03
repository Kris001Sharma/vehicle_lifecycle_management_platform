# VLM Platform User Manual

## About this manual
This manual explains how to use the Vehicle Lifecycle Management platform. It covers all actions available to each user role: Admin, Sales, and Service staff. Each section explains what to do, step by step, in plain language. Screenshots are not included — follow the steps as described and the interface will guide you.

---

## Getting started

### Signing in
1. Open the application URL in your Chrome browser.
2. On the welcome screen, you will see three portal options: Admin, Sales, and Service. Do not click these yet.
3. Your administrator will provide you with your email address and password.
4. The system will direct you to the correct portal based on your account type automatically after sign-in.
5. For security, the application signs you out automatically after 8 hours of inactivity. You will see a warning 1 minute before this happens. Click "Stay signed in" to continue your session.

### Signing out
Click your name or the sign out button in the bottom left corner of the sidebar. You will be asked to confirm before being signed out.

---

## Admin portal

The Admin portal is for system administrators only. It is used to set up the vehicle catalog, manage users, and review system activity.

### Catalog settings
Before adding vehicles, configure which vehicle categories and powertrain types your dealership handles. This step is optional — if skipped, all available categories and powertrain types will be shown.

To configure catalog settings:
1. In the left sidebar, click Settings, then Catalog settings.
2. Under "Vehicle categories", toggle on the categories your dealership sells. Example: if your dealership sells only trucks and buses, enable "Heavy Commercial Vehicle" only.
3. Under "Powertrain types", toggle on the fuel types your vehicles use. Example: enable "Diesel" and "Electric (BEV)" if those are your only options.
4. Under "Default service schedule", enter the km and month interval that applies to most of your vehicles. This can be changed per variant when adding vehicles.
5. Select your market and currency.
6. Click Save. A confirmation message will appear.

Note: Leaving all toggles off means all categories and powertrain types are available. There is no wrong answer here — you can update these settings at any time.

---

### Managing the vehicle catalog

The vehicle catalog is the master list of all vehicle models and their variants. Every vehicle sold must be linked to a variant in the catalog. Setting up the catalog correctly ensures that sales and service records capture accurate information automatically.

The catalog has three levels:
- **Model**: the base vehicle (e.g. Tata Ace, Toyota Innova)
- **Variant**: a specific version of the model with its own specifications (e.g. Tata Ace EV 600kg Payload)
- **Features**: equipment included or available on a variant

#### Adding a new vehicle model
1. In the sidebar, click Catalog, then Models & Variants.
2. Click the "Add model" button in the top right.
3. Fill in the manufacturer name. You can type any name — common manufacturers appear as suggestions.
4. Enter the model name exactly as it should appear in records (e.g. "Ace EV", "Innova Crysta").
5. Select the vehicle category by clicking the appropriate card (e.g. "Light Commercial Vehicle").
6. Select the use type: Personal, Commercial, or Both.
7. Enter the model year (the year this model was launched). Leave "Year to" blank if the model is still current.
8. Add a description if needed (optional).
9. Click Save.

The model now appears in the catalog. You must add at least one variant before this model can be used in a sale.

#### Adding a variant to a model
A variant defines the exact specifications of a vehicle. One model can have many variants (e.g. different battery sizes, payload options, or trim levels).

1. Find the model in the catalog and click "Add variant".
2. **Variant identity**: Enter the variant name (e.g. "600kg Payload Standard Range"), an internal code if your dealership uses one, and set the status to Active when ready to sell.
3. **Powertrain type**: Click the card matching this variant's fuel type (e.g. "Electric (BEV)"). The specification fields will appear automatically.
4. **Powertrain specifications**: Fill in the technical details. Fields marked with * are required. Units are shown next to each field (kW, kWh, km, etc.). You do not need to fill every field — only fill what you know and what is relevant.
5. **Vehicle specifications**: Fill in category-specific details such as payload, seating, or body type.
6. **Dimensions & weight**: Enter physical dimensions if available. These are optional.
7. **Warranty & service**: Enter the warranty period in years for the vehicle and powertrain. For electric vehicles, also enter the battery warranty. Enter the service interval — both km and months. The system will use whichever comes first to alert you when a vehicle is due for service.
8. **Standard features**: Tick the features that come included with every vehicle of this variant. These will be automatically added to every sale.
9. **Optional add-on features**: Tick the features that can be added at the time of sale (customer choice). These will appear as options during the sales process.
10. Click "Save and activate" when the variant is ready to be sold. Click "Save as draft" to continue later.

#### Cloning a variant
If you are adding a variant that is similar to an existing one, use the clone feature to save time:
1. Find the existing variant in the catalog.
2. Click the clone icon (two overlapping pages icon).
3. A copy is created with the name prefixed "Copy of". It is set to Draft status automatically.
4. Edit the cloned variant and change only what is different.
5. Save and activate when ready.

#### Discontinuing a variant
When a variant is no longer sold:
1. Find the variant and click Edit.
2. Change the Status to "Discontinued".
3. Click Save.
Vehicles already sold on this variant are not affected. Their records remain intact.

Note: You cannot discontinue a variant that has active vehicles. Retire or transfer those vehicles first.

#### Managing features
Features are the equipment and options available across your catalog. You can add new features at any time.

To add a new feature:
1. In the sidebar, click Catalog, then Features.
2. Click "Add feature".
3. Enter the feature name (e.g. "GPS Fleet Tracker").
4. Select the category (Safety, Comfort, Connectivity, Lighting, or Utility).
5. Save. The feature is now available to add to variants.

To add a feature to a specific variant:
Open the variant for editing and tick the feature in Section G (standard) or Section H (optional).
