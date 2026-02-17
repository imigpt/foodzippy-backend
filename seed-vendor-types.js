import mongoose from 'mongoose';
import dotenv from 'dotenv';
import VendorType from './models/VendorType.js';
import VendorFormConfig from './models/VendorFormConfig.js';
import VendorFormSection from './models/VendorFormSection.js';

// Load environment variables
dotenv.config();

// ==========================================
// SEED VENDOR TYPES
// ==========================================
const vendorTypes = [
  {
    name: 'Restaurant',
    slug: 'restaurant',
    description: 'Full-service dining establishments',
    icon: 'utensils',
    order: 1,
    isActive: true,
  },
  {
    name: 'Cafe',
    slug: 'cafe',
    description: 'Coffee shops and casual dining',
    icon: 'coffee',
    order: 2,
    isActive: true,
  },
  {
    name: 'Hotel',
    slug: 'hotel',
    description: 'Hotels with food service',
    icon: 'hotel',
    order: 3,
    isActive: true,
  },
  {
    name: 'Bakery',
    slug: 'bakery',
    description: 'Bakeries and pastry shops',
    icon: 'bread-slice',
    order: 4,
    isActive: true,
  },
  {
    name: 'Sweet Shop',
    slug: 'sweet-shop',
    description: 'Traditional sweet and dessert shops',
    icon: 'candy-cane',
    order: 5,
    isActive: true,
  },
];

async function seedVendorTypes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foodzippy');
    console.log('✅ Connected to MongoDB');

    // Clear existing vendor types
    await VendorType.deleteMany({});
    console.log('🗑️  Cleared existing vendor types');

    // Insert new vendor types
    const createdTypes = await VendorType.insertMany(vendorTypes);
    console.log(`✅ Created ${createdTypes.length} vendor types`);

    // Update existing form configs with empty vendorTypes array (applies to all)
    await VendorFormConfig.updateMany(
      { vendorTypes: { $exists: false } },
      { $set: { vendorTypes: [] } }
    );
    console.log('✅ Updated form configs with vendorTypes field');

    // Update existing form sections with empty vendorTypes array (applies to all)
    await VendorFormSection.updateMany(
      { vendorTypes: { $exists: false } },
      { $set: { vendorTypes: [] } }
    );
    console.log('✅ Updated form sections with vendorTypes field');

    // Add labelTemplate to sections that contain "Restaurant" in their label
    const sectionsWithRestaurant = await VendorFormSection.find({
      sectionLabel: /restaurant/i,
    });

    for (const section of sectionsWithRestaurant) {
      const labelTemplate = section.sectionLabel.replace(/restaurant/gi, '{type}');
      section.labelTemplate = labelTemplate;
      await section.save();
      console.log(`✅ Updated section template: ${section.sectionLabel} → ${labelTemplate}`);
    }

    // Add labelTemplate to fields that contain "Restaurant" in their label
    const fieldsWithRestaurant = await VendorFormConfig.find({
      label: /restaurant/i,
    });

    for (const field of fieldsWithRestaurant) {
      const labelTemplate = field.label.replace(/restaurant/gi, '{type}');
      field.labelTemplate = labelTemplate;
      await field.save();
      console.log(`✅ Updated field template: ${field.label} → ${labelTemplate}`);
    }

    console.log('\n🎉 Vendor types seeded successfully!');
    console.log('📝 Summary:');
    console.log(`   - ${createdTypes.length} vendor types created`);
    console.log(`   - ${sectionsWithRestaurant.length} sections updated with templates`);
    console.log(`   - ${fieldsWithRestaurant.length} fields updated with templates`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding vendor types:', error);
    process.exit(1);
  }
}

seedVendorTypes();
