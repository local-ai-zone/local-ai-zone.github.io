#!/usr/bin/env python3
"""
Backup management utilities for model data
"""

import json
import os
import shutil
from datetime import datetime
from typing import Dict, List, Optional
import logging


class BackupManager:
    """Manages backup creation and restoration for model data"""
    
    def __init__(self, backup_dir: str = "data/backups"):
        self.backup_dir = backup_dir
        self.logger = logging.getLogger(__name__)
        self._ensure_backup_dir()
    
    def _ensure_backup_dir(self):
        """Ensure backup directory exists"""
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir, exist_ok=True)
            self.logger.info(f"Created backup directory: {self.backup_dir}")
    
    def create_backup(self, data: List[Dict], source_file: str = "gguf_models.json") -> str:
        """
        Create a timestamped backup of model data
        
        Args:
            data: Model data to backup
            source_file: Original filename for reference
            
        Returns:
            Path to created backup file
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = os.path.splitext(os.path.basename(source_file))[0]
        backup_filename = f"{base_name}_backup_{timestamp}.json"
        backup_path = os.path.join(self.backup_dir, backup_filename)
        
        try:
            with open(backup_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"Created backup: {backup_path} ({len(data):,} entries)")
            return backup_path
            
        except Exception as e:
            self.logger.error(f"Failed to create backup {backup_path}: {e}")
            raise
    
    def create_file_backup(self, file_path: str) -> str:
        """
        Create a backup by copying an existing file
        
        Args:
            file_path: Path to file to backup
            
        Returns:
            Path to created backup file
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Source file not found: {file_path}")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = os.path.splitext(os.path.basename(file_path))[0]
        backup_filename = f"{base_name}_backup_{timestamp}.json"
        backup_path = os.path.join(self.backup_dir, backup_filename)
        
        try:
            shutil.copy2(file_path, backup_path)
            self.logger.info(f"Created file backup: {backup_path}")
            return backup_path
            
        except Exception as e:
            self.logger.error(f"Failed to create file backup {backup_path}: {e}")
            raise
    
    def restore_backup(self, backup_path: str, target_file: str) -> bool:
        """
        Restore data from backup file
        
        Args:
            backup_path: Path to backup file
            target_file: Target file to restore to
            
        Returns:
            True if restoration successful, False otherwise
        """
        if not os.path.exists(backup_path):
            self.logger.error(f"Backup file not found: {backup_path}")
            return False
        
        try:
            # Validate backup file first
            with open(backup_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not isinstance(data, list):
                self.logger.error(f"Invalid backup format in {backup_path}")
                return False
            
            # Create backup of current target file if it exists
            if os.path.exists(target_file):
                current_backup = self.create_file_backup(target_file)
                self.logger.info(f"Created backup of current file: {current_backup}")
            
            # Restore from backup
            shutil.copy2(backup_path, target_file)
            self.logger.info(f"Restored {target_file} from {backup_path} ({len(data):,} entries)")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to restore from backup {backup_path}: {e}")
            return False
    
    def list_backups(self, pattern: str = "*backup*.json") -> List[Dict]:
        """
        List available backup files
        
        Args:
            pattern: File pattern to match
            
        Returns:
            List of backup file information
        """
        import glob
        
        backup_pattern = os.path.join(self.backup_dir, pattern)
        backup_files = glob.glob(backup_pattern)
        
        backups = []
        for backup_file in sorted(backup_files, reverse=True):  # Newest first
            try:
                stat = os.stat(backup_file)
                with open(backup_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                backups.append({
                    'path': backup_file,
                    'filename': os.path.basename(backup_file),
                    'size_bytes': stat.st_size,
                    'size_formatted': self._format_file_size(stat.st_size),
                    'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'entry_count': len(data) if isinstance(data, list) else 0
                })
                
            except Exception as e:
                self.logger.warning(f"Could not read backup file {backup_file}: {e}")
        
        return backups
    
    def cleanup_old_backups(self, keep_count: int = 10) -> int:
        """
        Clean up old backup files, keeping only the most recent ones
        
        Args:
            keep_count: Number of recent backups to keep
            
        Returns:
            Number of files deleted
        """
        backups = self.list_backups()
        
        if len(backups) <= keep_count:
            return 0
        
        deleted_count = 0
        for backup in backups[keep_count:]:  # Skip the most recent ones
            try:
                os.remove(backup['path'])
                self.logger.info(f"Deleted old backup: {backup['filename']}")
                deleted_count += 1
            except Exception as e:
                self.logger.warning(f"Could not delete backup {backup['filename']}: {e}")
        
        return deleted_count
    
    def get_backup_info(self, backup_path: str) -> Optional[Dict]:
        """
        Get information about a specific backup file
        
        Args:
            backup_path: Path to backup file
            
        Returns:
            Backup information dictionary or None if file not found
        """
        if not os.path.exists(backup_path):
            return None
        
        try:
            stat = os.stat(backup_path)
            with open(backup_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            return {
                'path': backup_path,
                'filename': os.path.basename(backup_path),
                'size_bytes': stat.st_size,
                'size_formatted': self._format_file_size(stat.st_size),
                'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'entry_count': len(data) if isinstance(data, list) else 0,
                'valid': isinstance(data, list)
            }
            
        except Exception as e:
            self.logger.error(f"Could not get info for backup {backup_path}: {e}")
            return None
    
    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size in human-readable format"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"