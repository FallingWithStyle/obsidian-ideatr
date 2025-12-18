/**
 * ObsidianAdapterWrapper - Wraps Obsidian Vault for use with @ideatr/core
 * 
 * This adapter bridges the gap between Obsidian's Vault API and the core's
 * FileSystemAdapter interface.
 */

import { Vault, TFile } from 'obsidian';
import { ObsidianAdapter, type ObsidianVault } from '@ideatr/core';

/**
 * Wrapper that adapts Obsidian Vault to ObsidianVault interface
 */
class VaultWrapper implements ObsidianVault {
  constructor(private vault: Vault) {}

  async read(file: { path: string }): Promise<string> {
    const abstractFile = this.vault.getAbstractFileByPath(file.path);
    if (!abstractFile || !(abstractFile instanceof TFile)) {
      throw new Error(`File not found: ${file.path}`);
    }
    return await this.vault.read(abstractFile);
  }

  async cachedRead(file: { path: string }): Promise<string> {
    const abstractFile = this.vault.getAbstractFileByPath(file.path);
    if (!abstractFile || !(abstractFile instanceof TFile)) {
      throw new Error(`File not found: ${file.path}`);
    }
    return await this.vault.cachedRead(abstractFile);
  }

  async create(path: string, content: string): Promise<{ path: string; name: string }> {
    const file = await this.vault.create(path, content);
    return { path: file.path, name: file.name };
  }

  async modify(file: { path: string }, content: string): Promise<void> {
    const abstractFile = this.vault.getAbstractFileByPath(file.path);
    if (!abstractFile || !(abstractFile instanceof TFile)) {
      throw new Error(`File not found: ${file.path}`);
    }
    await this.vault.modify(abstractFile, content);
  }

  async delete(file: { path: string }): Promise<void> {
    const abstractFile = this.vault.getAbstractFileByPath(file.path);
    if (!abstractFile) {
      throw new Error(`File not found: ${file.path}`);
    }
    await this.vault.delete(abstractFile);
  }

  async rename(file: { path: string }, newPath: string): Promise<void> {
    const abstractFile = this.vault.getAbstractFileByPath(file.path);
    if (!abstractFile) {
      throw new Error(`File not found: ${file.path}`);
    }
    await this.vault.rename(abstractFile, newPath);
  }

  async createFolder(path: string): Promise<void> {
    await this.vault.createFolder(path);
  }

  getAbstractFileByPath(path: string): { path: string; name: string; stat: { mtime: number; size: number } } | null {
    const abstractFile = this.vault.getAbstractFileByPath(path);
    if (!abstractFile || !(abstractFile instanceof TFile)) {
      return null;
    }
    return {
      path: abstractFile.path,
      name: abstractFile.name,
      stat: {
        mtime: abstractFile.stat.mtime,
        size: abstractFile.stat.size
      }
    };
  }

  getMarkdownFiles(): Array<{ path: string; name: string; stat: { mtime: number; size: number } }> {
    return this.vault.getMarkdownFiles().map(file => ({
      path: file.path,
      name: file.name,
      stat: {
        mtime: file.stat.mtime,
        size: file.stat.size
      }
    }));
  }

  getFiles(): Array<{ path: string; name: string; stat: { mtime: number; size: number } }> {
    return this.vault.getFiles().map(file => ({
      path: file.path,
      name: file.name,
      stat: {
        mtime: file.stat.mtime,
        size: file.stat.size
      }
    }));
  }

  on(event: 'modify' | 'create' | 'delete', callback: (file: { path: string; name: string }) => void): () => void {
    let eventRef: any;
    
    if (event === 'modify') {
      eventRef = this.vault.on('modify', (file) => {
        callback({ path: file.path, name: file.name });
      });
    } else if (event === 'create') {
      eventRef = this.vault.on('create', (file) => {
        callback({ path: file.path, name: file.name });
      });
    } else if (event === 'delete') {
      eventRef = this.vault.on('delete', (file) => {
        callback({ path: file.path, name: file.name });
      });
    }
    
    // Return unsubscribe function
    return () => {
      this.vault.offref(eventRef);
    };
  }
}

/**
 * Create an ObsidianAdapter from an Obsidian Vault
 */
export function createObsidianAdapter(vault: Vault): ObsidianAdapter {
  const wrapper = new VaultWrapper(vault);
  return new ObsidianAdapter(wrapper);
}

