import VendorFormConfig from '../models/VendorFormConfig.js';
import VendorFormSection from '../models/VendorFormSection.js';

// Helper function to capitalize first letter
const capitalizeFirst = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Helper function to replace "restaurant" with vendor type in a string
const replaceVendorType = (text, vendorType) => {
  if (!text || !vendorType) return text;
  const capitalizedType = capitalizeFirst(vendorType);
  // Replace "Restaurant" (case-insensitive) with capitalized vendor type
  return text.replace(/restaurant/gi, capitalizedType);
};

// ==========================================
// FORM CONFIG CRUD (Admin Only)
// ==========================================

// Get all form configurations with sections
export const getFormConfig = async (req, res) => {
  try {
    const { visibleTo, vendorType } = req.query; // Filter by role and vendor type if needed

    // Build sections query
    let sectionsQuery = { isActive: true };
    
    // Filter by vendor type if specified
    if (vendorType) {
      sectionsQuery.$or = [
        { vendorTypes: vendorType },
        { vendorTypes: { $size: 0 } }, // Empty array means applies to all types
        { vendorTypes: { $exists: false } }, // Field doesn't exist
      ];
    }

    // Get sections
    let sections = await VendorFormSection.find(sectionsQuery).sort({ stepNumber: 1, order: 1 });

    // Build fields query
    let fieldsQuery = { isActive: true };
    
    if (visibleTo) {
      fieldsQuery.visibleTo = visibleTo;
    }

    // Filter by vendor type if specified
    if (vendorType) {
      fieldsQuery.$or = [
        { vendorTypes: vendorType },
        { vendorTypes: { $size: 0 } }, // Empty array means applies to all types
        { vendorTypes: { $exists: false } }, // Field doesn't exist
      ];
    }

    const fields = await VendorFormConfig.find(fieldsQuery).sort({ section: 1, order: 1 });

    // Group fields by section and replace labels dynamically
    const formConfig = sections.map((section) => {
      const sectionObj = section.toObject();
      
      // Dynamically replace "Restaurant" with vendor type in section label and description
      if (vendorType) {
        sectionObj.sectionLabel = replaceVendorType(sectionObj.sectionLabel, vendorType);
        sectionObj.sectionDescription = replaceVendorType(sectionObj.sectionDescription, vendorType);
      }

      const sectionFields = fields
        .filter((field) => field.section === section.sectionKey)
        .map((field) => {
          const fieldObj = field.toObject();
          
          // Dynamically replace "Restaurant" with vendor type in field label and placeholder
          if (vendorType) {
            fieldObj.label = replaceVendorType(fieldObj.label, vendorType);
            fieldObj.placeholder = replaceVendorType(fieldObj.placeholder, vendorType);
            fieldObj.helpText = replaceVendorType(fieldObj.helpText, vendorType);
          }
          
          return fieldObj;
        });

      return {
        ...sectionObj,
        fields: sectionFields,
      };
    });

    res.status(200).json({
      success: true,
      data: formConfig,
    });
  } catch (error) {
    console.error('Error fetching form config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch form configuration',
      error: error.message,
    });
  }
};

// Get single field config
export const getFieldConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const field = await VendorFormConfig.findById(id);

    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Field not found',
      });
    }

    res.status(200).json({
      success: true,
      data: field,
    });
  } catch (error) {
    console.error('Error fetching field config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch field configuration',
      error: error.message,
    });
  }
};

// Create new field config
export const createFieldConfig = async (req, res) => {
  try {
    const fieldData = req.body;

    // Check if fieldKey already exists
    const existingField = await VendorFormConfig.findOne({ fieldKey: fieldData.fieldKey });
    if (existingField) {
      return res.status(400).json({
        success: false,
        message: 'Field key already exists',
      });
    }

    const field = new VendorFormConfig(fieldData);
    await field.save();

    res.status(201).json({
      success: true,
      message: 'Field created successfully',
      data: field,
    });
  } catch (error) {
    console.error('Error creating field config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create field configuration',
      error: error.message,
    });
  }
};

// Update field config
export const updateFieldConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const field = await VendorFormConfig.findById(id);

    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Field not found',
      });
    }

    // Prevent updating system fields' critical properties
    if (field.isSystemField) {
      const protectedFields = ['fieldKey', 'section'];
      protectedFields.forEach((protectedField) => {
        if (updateData[protectedField] && updateData[protectedField] !== field[protectedField]) {
          return res.status(403).json({
            success: false,
            message: `Cannot modify ${protectedField} of system field`,
          });
        }
      });
    }

    // Update field
    Object.assign(field, updateData);
    await field.save();

    res.status(200).json({
      success: true,
      message: 'Field updated successfully',
      data: field,
    });
  } catch (error) {
    console.error('Error updating field config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update field configuration',
      error: error.message,
    });
  }
};

// Delete field config
export const deleteFieldConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const field = await VendorFormConfig.findById(id);

    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Field not found',
      });
    }

    // Prevent deleting system fields
    if (field.isSystemField) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete system field',
      });
    }

    await VendorFormConfig.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Field deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting field config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete field configuration',
      error: error.message,
    });
  }
};

// Bulk update field order
export const updateFieldOrder = async (req, res) => {
  try {
    const { fields } = req.body; // Array of { id, order }

    const bulkOps = fields.map(({ id, order }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order } },
      },
    }));

    await VendorFormConfig.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      message: 'Field order updated successfully',
    });
  } catch (error) {
    console.error('Error updating field order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update field order',
      error: error.message,
    });
  }
};

// ==========================================
// SECTION CRUD (Admin Only)
// ==========================================

// Get all sections
export const getAllSections = async (req, res) => {
  try {
    const sections = await VendorFormSection.find().sort({ stepNumber: 1, order: 1 });

    res.status(200).json({
      success: true,
      data: sections,
    });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sections',
      error: error.message,
    });
  }
};

// Create section
export const createSection = async (req, res) => {
  try {
    const sectionData = req.body;

    const section = new VendorFormSection(sectionData);
    await section.save();

    res.status(201).json({
      success: true,
      message: 'Section created successfully',
      data: section,
    });
  } catch (error) {
    console.error('Error creating section:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create section',
      error: error.message,
    });
  }
};

// Update section
export const updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const section = await VendorFormSection.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Section updated successfully',
      data: section,
    });
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update section',
      error: error.message,
    });
  }
};

// Delete section
export const deleteSection = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if section has fields
    const section = await VendorFormSection.findById(id);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    const fieldsCount = await VendorFormConfig.countDocuments({ section: section.sectionKey });
    if (fieldsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete section with existing fields',
      });
    }

    await VendorFormSection.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Section deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete section',
      error: error.message,
    });
  }
};
