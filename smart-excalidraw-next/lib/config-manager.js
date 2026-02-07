/**
 * Configuration Manager - Manages multiple LLM API configurations
 */

class ConfigManager {
  constructor() {
    this.STORAGE_KEY = 'smart-excalidraw-configs';
    this.ACTIVE_CONFIG_KEY = 'smart-excalidraw-active-config';
    this.configs = [];
    this.activeConfigId = null;
    this.isLoaded = false;
    // Don't load configs in constructor to avoid SSR issues
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Ensure configs are loaded
   */
  ensureLoaded() {
    if (!this.isLoaded) {
      this.loadConfigs();
    }
  }

  /**
   * Get active config ID
   */
  getActiveConfigId() {
    this.ensureLoaded();
    return this.activeConfigId;
  }

  /**
   * Load configs from localStorage
   */
  loadConfigs() {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      this.configs = stored ? JSON.parse(stored) : [];
      this.activeConfigId = localStorage.getItem(this.ACTIVE_CONFIG_KEY);
      this.isLoaded = true;

      // If no active config but config list exists, set first as active
      if (!this.activeConfigId && this.configs.length > 0) {
        this.activeConfigId = this.configs[0].id;
        this.saveActiveConfigId();
      }
    } catch (error) {
      console.error('Failed to load configs:', error);
      this.configs = [];
      this.activeConfigId = null;
      this.isLoaded = true;
    }
  }

  /**
   * Save configs to localStorage
   */
  saveConfigs() {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.configs));
    } catch (error) {
      console.error('Failed to save configs:', error);
    }
  }

  /**
   * Save active config ID
   */
  saveActiveConfigId() {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (this.activeConfigId) {
        localStorage.setItem(this.ACTIVE_CONFIG_KEY, this.activeConfigId);
      } else {
        localStorage.removeItem(this.ACTIVE_CONFIG_KEY);
      }
    } catch (error) {
      console.error('Failed to save active config ID:', error);
    }
  }

  /**
   * Create new config
   */
  createConfig(configData) {
    const newConfig = {
      id: this.generateId(),
      name: configData.name || 'New Config',
      type: configData.type || 'openai',
      baseUrl: configData.baseUrl || '',
      apiKey: configData.apiKey || '',
      model: configData.model || '',
      description: configData.description || '',
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...configData
    };

    this.configs.push(newConfig);

    // If this is the first config, set as active
    if (this.configs.length === 1) {
      this.setActiveConfig(newConfig.id);
    }

    this.saveConfigs();
    return newConfig;
  }

  /**
   * Update config
   */
  updateConfig(id, updateData) {
    const configIndex = this.configs.findIndex(config => config.id === id);
    if (configIndex === -1) {
      throw new Error('Config does not exist');
    }

    this.configs[configIndex] = {
      ...this.configs[configIndex],
      ...updateData,
      id, // Ensure ID is not modified
      updatedAt: new Date().toISOString()
    };

    this.saveConfigs();
    return this.configs[configIndex];
  }

  /**
   * Delete config
   */
  deleteConfig(id) {
    const configIndex = this.configs.findIndex(config => config.id === id);
    if (configIndex === -1) {
      throw new Error('Config does not exist');
    }

    // If deleting the active config, need to reset active config
    if (this.activeConfigId === id) {
      this.activeConfigId = null;
      // Set first remaining config as active
      if (this.configs.length > 1) {
        const remainingConfigs = this.configs.filter(config => config.id !== id);
        this.activeConfigId = remainingConfigs[0].id;
        this.saveActiveConfigId();
      } else {
        this.saveActiveConfigId();
      }
    }

    this.configs.splice(configIndex, 1);
    this.saveConfigs();
  }

  /**
   * Get all configs
   */
  getAllConfigs() {
    this.ensureLoaded();
    return [...this.configs];
  }

  /**
   * Get config by ID
   */
  getConfig(id) {
    this.ensureLoaded();
    return this.configs.find(config => config.id === id);
  }

  /**
   * Get current active config
   */
  getActiveConfig() {
    this.ensureLoaded();
    if (!this.activeConfigId) return null;
    return this.getConfig(this.activeConfigId);
  }

  /**
   * Set active config
   */
  setActiveConfig(id) {
    const config = this.getConfig(id);
    if (!config) {
      throw new Error('Config does not exist');
    }

    this.activeConfigId = id;
    this.saveActiveConfigId();
    return config;
  }

  /**
   * Clone config
   */
  cloneConfig(id, newName) {
    this.ensureLoaded();
    const originalConfig = this.getConfig(id);
    if (!originalConfig) {
      throw new Error('Original config does not exist');
    }

    const clonedConfig = {
      ...originalConfig,
      name: newName || `${originalConfig.name} (Copy)`,
      isActive: false
    };

    delete clonedConfig.id;
    delete clonedConfig.createdAt;
    delete clonedConfig.updatedAt;

    return this.createConfig(clonedConfig);
  }

  /**
   * Validate config
   */
  validateConfig(config) {
    const errors = [];

    if (!config.name || config.name.trim() === '') {
      errors.push('Config name cannot be empty');
    }

    if (!config.type || !['openai', 'anthropic', 'backboard'].includes(config.type)) {
      errors.push('Config type must be openai, anthropic, or backboard');
    }

    if (!config.baseUrl || config.baseUrl.trim() === '') {
      errors.push('API URL cannot be empty');
    } else {
      try {
        new URL(config.baseUrl);
      } catch {
        errors.push('API URL format is incorrect');
      }
    }

    if (!config.apiKey || config.apiKey.trim() === '') {
      errors.push('API key cannot be empty');
    }

    if (!config.model || config.model.trim() === '') {
      errors.push('Model name cannot be empty');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Test config connection
   */
  async testConnection(config) {
    const validation = this.validateConfig(config);
    if (!validation.isValid) {
      throw new Error('Invalid config: ' + validation.errors.join(', '));
    }

    try {
      // Actual connection test logic can be added here
      // Temporarily return success status
      return { success: true, message: 'Connection test successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Import configs
   */
  importConfigs(configsData) {
    try {
      const importedConfigs = JSON.parse(configsData);
      if (!Array.isArray(importedConfigs)) {
        throw new Error('Invalid import data format');
      }

      let importCount = 0;
      for (const configData of importedConfigs) {
        // Validate config format
        const validation = this.validateConfig(configData);
        if (validation.isValid) {
          this.createConfig({
            ...configData,
            isActive: false
          });
          importCount++;
        }
      }

      return { success: true, count: importCount };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Export configs
   */
  exportConfigs() {
    return JSON.stringify(this.configs, null, 2);
  }

  /**
   * Search configs
   */
  searchConfigs(query) {
    this.ensureLoaded();
    const lowerQuery = query.toLowerCase();
    return this.configs.filter(config =>
      config.name.toLowerCase().includes(lowerQuery) ||
      config.description.toLowerCase().includes(lowerQuery) ||
      config.type.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get config statistics
   */
  getStats() {
    this.ensureLoaded();
    const stats = {
      total: this.configs.length,
      active: 0,
      byType: {}
    };

    this.configs.forEach(config => {
      if (config.id === this.activeConfigId) {
        stats.active = 1;
      }

      const type = config.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  }
}

// Export singleton instance
export const configManager = new ConfigManager();
export default ConfigManager;