import VendorType from '../models/VendorType.js';

// ==========================================
// GET ALL VENDOR TYPES (Public)
// ==========================================
export const getAllVendorTypes = async (req, res) => {
  try {
    const { activeOnly } = req.query;

    const query = activeOnly === 'true' ? { isActive: true } : {};
    const vendorTypes = await VendorType.find(query).sort({ order: 1, name: 1 });

    res.status(200).json({
      success: true,
      data: vendorTypes,
    });
  } catch (error) {
    console.error('Error fetching vendor types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor types',
      error: error.message,
    });
  }
};

// ==========================================
// GET SINGLE VENDOR TYPE (Public)
// ==========================================
export const getVendorType = async (req, res) => {
  try {
    const { id } = req.params;

    const vendorType = await VendorType.findById(id);

    if (!vendorType) {
      return res.status(404).json({
        success: false,
        message: 'Vendor type not found',
      });
    }

    res.status(200).json({
      success: true,
      data: vendorType,
    });
  } catch (error) {
    console.error('Error fetching vendor type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor type',
      error: error.message,
    });
  }
};

// ==========================================
// CREATE VENDOR TYPE (Admin Only)
// ==========================================
export const createVendorType = async (req, res) => {
  try {
    const { name, slug, description, icon, order } = req.body;

    // Check if slug already exists
    const existingType = await VendorType.findOne({ slug });
    if (existingType) {
      return res.status(400).json({
        success: false,
        message: 'Vendor type with this slug already exists',
      });
    }

    const vendorType = new VendorType({
      name,
      slug,
      description,
      icon,
      order,
    });

    await vendorType.save();

    res.status(201).json({
      success: true,
      message: 'Vendor type created successfully',
      data: vendorType,
    });
  } catch (error) {
    console.error('Error creating vendor type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vendor type',
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE VENDOR TYPE (Admin Only)
// ==========================================
export const updateVendorType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, icon, isActive, order } = req.body;

    const vendorType = await VendorType.findById(id);

    if (!vendorType) {
      return res.status(404).json({
        success: false,
        message: 'Vendor type not found',
      });
    }

    // Check if slug is being changed and already exists
    if (slug && slug !== vendorType.slug) {
      const existingType = await VendorType.findOne({ slug });
      if (existingType) {
        return res.status(400).json({
          success: false,
          message: 'Vendor type with this slug already exists',
        });
      }
    }

    // Update fields
    if (name) vendorType.name = name;
    if (slug) vendorType.slug = slug;
    if (description !== undefined) vendorType.description = description;
    if (icon) vendorType.icon = icon;
    if (isActive !== undefined) vendorType.isActive = isActive;
    if (order !== undefined) vendorType.order = order;

    await vendorType.save();

    res.status(200).json({
      success: true,
      message: 'Vendor type updated successfully',
      data: vendorType,
    });
  } catch (error) {
    console.error('Error updating vendor type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vendor type',
      error: error.message,
    });
  }
};

// ==========================================
// DELETE VENDOR TYPE (Admin Only)
// ==========================================
export const deleteVendorType = async (req, res) => {
  try {
    const { id } = req.params;

    const vendorType = await VendorType.findById(id);

    if (!vendorType) {
      return res.status(404).json({
        success: false,
        message: 'Vendor type not found',
      });
    }

    await VendorType.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Vendor type deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting vendor type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vendor type',
      error: error.message,
    });
  }
};

// ==========================================
// REORDER VENDOR TYPES (Admin Only)
// ==========================================
export const reorderVendorTypes = async (req, res) => {
  try {
    const { orders } = req.body; // [{ id: '...', order: 1 }, ...]

    if (!Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        message: 'Orders must be an array',
      });
    }

    // Update each vendor type's order
    const updatePromises = orders.map(({ id, order }) =>
      VendorType.findByIdAndUpdate(id, { order })
    );

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Vendor types reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering vendor types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder vendor types',
      error: error.message,
    });
  }
};
