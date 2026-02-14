# Backend Changes for Vendor Type System

## ✅ Completed Backend Implementation

### 1. **New Model: VendorType.js**
- Created vendor type model with fields:
  - `name`: Display name (Restaurant, Cafe, Hotel, etc.)
  - `slug`: URL-friendly identifier (restaurant, cafe, hotel)
  - `description`: Type description
  - `icon`: Icon identifier for UI
  - `isActive`: Enable/disable types
  - `order`: Display order

### 2. **Updated Models**

#### VendorFormConfig.js
- Added `vendorTypes: [String]` - Array of vendor type slugs this field applies to
- Added `labelTemplate: String` - Template for dynamic labels (e.g., "{type} Name")
- Empty array means field applies to ALL vendor types
- Added index for vendorTypes field

#### VendorFormSection.js
- Added `vendorTypes: [String]` - Array of vendor type slugs this section applies to
- Added `labelTemplate: String` - Template for dynamic section labels
- Empty array means section applies to ALL vendor types

#### Vendor.js
- Added `vendorType: String` - Tracks which type of vendor (restaurant/cafe/hotel/etc.)
- Required field with default value 'restaurant'
- Indexed for performance

### 3. **New Controller: vendorType.controller.js**
Functions:
- `getAllVendorTypes()` - Get all types (public, for agent/employee)
- `getVendorType(id)` - Get single type
- `createVendorType()` - Admin creates new type
- `updateVendorType(id)` - Admin updates type
- `deleteVendorType(id)` - Admin deletes type
- `reorderVendorTypes()` - Admin reorders display

### 4. **Updated Controllers**

#### formConfig.controller.js - getFormConfig()
**New Features:**
- Accepts `vendorType` query parameter
- Filters sections and fields by vendor type
- Replaces `{type}` placeholder in labelTemplate with actual vendor type
- Example: Template "{type} Name" + vendorType "cafe" → "Cafe Name"

Query Examples:
```javascript
GET /api/form/config?vendorType=cafe
GET /api/form/config?vendorType=hotel&visibleTo=agent
```

#### vendor.controller.js - registerVendor()
**Updates:**
- Accepts `vendorType` in request body
- Validates and filters form fields by vendor type
- Saves vendorType with vendor document
- Only validates fields applicable to selected type

### 5. **New Routes: vendorType.routes.js**
```
GET    /api/vendor-types          - Get all vendor types (public)
GET    /api/vendor-types/:id      - Get single type (public)
POST   /api/vendor-types          - Create type (admin only)
PUT    /api/vendor-types/:id      - Update type (admin only)
DELETE /api/vendor-types/:id      - Delete type (admin only)
POST   /api/vendor-types/reorder  - Reorder types (admin only)
```

### 6. **Seed Script: seed-vendor-types.js**
Creates 5 default vendor types:
1. Restaurant (slug: restaurant)
2. Cafe (slug: cafe)
3. Hotel (slug: hotel)
4. Bakery (slug: bakery)
5. Sweet Shop (slug: sweet-shop)

**Auto-migration:**
- Updates existing form configs with `vendorTypes: []` (applies to all)
- Updates existing sections with `vendorTypes: []`
- Scans labels containing "restaurant" and creates templates with "{type}"
- Example: "Restaurant Name" → labelTemplate: "{type} Name"

### 7. **Server.js Updated**
- Added vendorType routes: `app.use('/api/vendor-types', vendorTypeRoutes)`
- Ready to serve vendor type endpoints

---

## 🚀 How to Run Seed Script

```bash
cd backend
node seed-vendor-types.js
```

This will:
- Create 5 default vendor types
- Update all existing form fields/sections with vendorTypes field
- Auto-generate label templates for "Restaurant" → "{type}"

---

## 📡 API Usage Examples

### Get Form Config for Cafe
```javascript
GET /api/form/config?vendorType=cafe&visibleTo=agent

Response:
{
  success: true,
  data: [
    {
      sectionLabel: "Cafe Information",  // Dynamic!
      fields: [
        { label: "Cafe Name", ... },      // Dynamic!
        { label: "Cafe Image", ... }      // Dynamic!
      ]
    }
  ]
}
```

### Register Cafe Vendor
```javascript
POST /api/vendors/register
Body: {
  vendorType: "cafe",
  formData: { ... },
  review: { ... }
}
```

---

## 🎯 What This Achieves

✅ **Dynamic Label Replacement**: "Restaurant" → "Cafe" / "Hotel" / "Bakery"
✅ **Type-Specific Forms**: Each vendor type can have different fields
✅ **Shared Fields**: Email, password, etc. apply to all types (vendorTypes: [])
✅ **Admin Control**: Admin can create new vendor types anytime
✅ **Backward Compatible**: Existing data still works (defaults to 'restaurant')
✅ **Scalable**: Easy to add Pizza Shop, Juice Bar, etc. without code changes

---

## 🔜 Next Steps: Frontend Implementation

1. **Agent/Employee App**: Add vendor type selection step
2. **Admin Panel**: Vendor type management UI
3. **Form Builder**: Type selector to configure fields per type
