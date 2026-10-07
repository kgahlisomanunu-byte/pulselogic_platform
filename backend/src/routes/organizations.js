// backend/src/routes/organizations.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/db');

// ─── GET ALL ORGANIZATIONS ───
router.get('/', async (req, res) => {
    try {
        // Check if org_name column exists
        const [columns] = await db.query('SHOW COLUMNS FROM organizations');
        const hasOrgName = columns.some(col => col.Field === 'org_name');
        const hasName = columns.some(col => col.Field === 'name');
        
        let orderBy = 'org_id';
        if (hasOrgName) orderBy = 'org_name';
        else if (hasName) orderBy = 'name';
        
        const [organizations] = await db.query(`
            SELECT * FROM organizations ORDER BY ${orderBy}
        `);
        res.json({ success: true, organizations });
    } catch (error) {
        console.error('❌ Get organizations error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── GET ORGANIZATION BY ID ───
router.get('/:id', async (req, res) => {
    try {
        const [orgs] = await db.query('SELECT * FROM organizations WHERE org_id = ?', [req.params.id]);
        if (orgs.length === 0) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }
        res.json({ success: true, organization: orgs[0] });
    } catch (error) {
        console.error('❌ Get organization error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── CREATE ORGANIZATION ───
router.post('/', async (req, res) => {
    try {
        const { org_name, name, org_type, address, phone, email } = req.body;
        
        // Use org_name or name
        const orgName = org_name || name;
        
        if (!orgName) {
            return res.status(400).json({
                success: false,
                message: 'Organization name is required'
            });
        }

        // Check which column exists
        const [columns] = await db.query('SHOW COLUMNS FROM organizations');
        const hasOrgName = columns.some(col => col.Field === 'org_name');
        const hasName = columns.some(col => col.Field === 'name');
        
        let nameColumn = 'org_name';
        if (!hasOrgName && hasName) nameColumn = 'name';
        
        const [result] = await db.query(`
            INSERT INTO organizations (${nameColumn}, org_type, address, phone, email, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [orgName, org_type, address, phone, email]);

        const [newOrg] = await db.query('SELECT * FROM organizations WHERE org_id = ?', [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Organization created successfully',
            organization: newOrg[0]
        });

    } catch (error) {
        console.error('❌ Create organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create organization',
            error: error.message
        });
    }
});

// ─── UPDATE ORGANIZATION ───
router.put('/:id', async (req, res) => {
    try {
        const { org_name, name, org_type, address, phone, email, status } = req.body;
        const orgId = req.params.id;
        
        const orgName = org_name || name;
        
        if (!orgName) {
            return res.status(400).json({
                success: false,
                message: 'Organization name is required'
            });
        }

        const [columns] = await db.query('SHOW COLUMNS FROM organizations');
        const hasOrgName = columns.some(col => col.Field === 'org_name');
        const hasName = columns.some(col => col.Field === 'name');
        
        let nameColumn = 'org_name';
        if (!hasOrgName && hasName) nameColumn = 'name';

        await db.query(`
            UPDATE organizations 
            SET ${nameColumn} = ?, org_type = ?, address = ?, phone = ?, email = ?, status = ?
            WHERE org_id = ?
        `, [orgName, org_type, address, phone, email, status || 'active', orgId]);

        const [updated] = await db.query('SELECT * FROM organizations WHERE org_id = ?', [orgId]);

        res.json({
            success: true,
            message: 'Organization updated successfully',
            organization: updated[0]
        });

    } catch (error) {
        console.error('❌ Update organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update organization',
            error: error.message
        });
    }
});

// ─── DELETE ORGANIZATION ───
router.delete('/:id', async (req, res) => {
    try {
        const orgId = req.params.id;
        
        const [existing] = await db.query('SELECT org_id FROM organizations WHERE org_id = ?', [orgId]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        await db.query('DELETE FROM organizations WHERE org_id = ?', [orgId]);

        res.json({
            success: true,
            message: 'Organization deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete organization',
            error: error.message
        });
    }
});

module.exports = router;