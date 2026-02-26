import EmailTemplate from '../models/EmailTemplate.js';

// @desc    Get all templates
// @route   GET /api/email-templates
// @access  Private (Admin)
export const getAllTemplates = async (req, res) => {
  try {
    const templates = await EmailTemplate.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching templates', error: error.message });
  }
};

// @desc    Get single template
// @route   GET /api/email-templates/:id
// @access  Private (Admin)
export const getTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching template', error: error.message });
  }
};

// @desc    Create template
// @route   POST /api/email-templates
// @access  Private (Admin)
export const createTemplate = async (req, res) => {
  try {
    const { name, subject, body, variables } = req.body;
    if (!name || !subject || !body) {
      return res.status(400).json({ success: false, message: 'Name, subject and body are required' });
    }
    const template = await EmailTemplate.create({ name, subject, body, variables: variables || [] });
    res.status(201).json({ success: true, message: 'Template created', data: template });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A template with this name already exists' });
    }
    res.status(500).json({ success: false, message: 'Error creating template', error: error.message });
  }
};

// @desc    Update template
// @route   PATCH /api/email-templates/:id
// @access  Private (Admin)
export const updateTemplate = async (req, res) => {
  try {
    const { subject, body, variables } = req.body;
    const update = {};
    if (subject) update.subject = subject;
    if (body) update.body = body;
    if (variables) update.variables = variables;

    const template = await EmailTemplate.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.status(200).json({ success: true, message: 'Template updated', data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating template', error: error.message });
  }
};

// @desc    Delete template
// @route   DELETE /api/email-templates/:id
// @access  Private (Admin)
export const deleteTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.status(200).json({ success: true, message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting template', error: error.message });
  }
};

// @desc    Seed default templates
// @route   POST /api/email-templates/seed
// @access  Private (Admin)
export const seedDefaultTemplates = async (req, res) => {
  try {
    const defaultTemplates = [
      {
        name: 'delivery_partner_approval',
        subject: 'Delivery Partner Application Approved',
        body: `Dear {{name}},\n\nCongratulations! Your application has been approved.\n\nLogin Details:\nID: {{loginId}}\nPassword: {{password}}\n\nPlease keep this information secure.\n\nYou can now log in to the Delivery Partner portal.\n\nRegards,\n{{appName}}`,
        variables: ['{{name}}', '{{loginId}}', '{{password}}', '{{appName}}'],
      },
    ];

    for (const t of defaultTemplates) {
      await EmailTemplate.findOneAndUpdate({ name: t.name }, t, { upsert: true, new: true });
    }

    res.status(200).json({ success: true, message: 'Default templates seeded' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error seeding templates', error: error.message });
  }
};
