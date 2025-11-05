#!/usr/bin/env python3
"""
Grabby Native Host - SPZ2PLY Integration
Simple native messaging host for Grabby Chrome extension
"""

import json
import sys
import os
import struct
import subprocess
from pathlib import Path

def send_message(message):
    """Send a message to the extension"""
    encoded_message = json.dumps(message).encode('utf-8')
    length = len(encoded_message)
    sys.stdout.buffer.write(struct.pack('<I', length))
    sys.stdout.buffer.write(encoded_message)
    sys.stdout.buffer.flush()

def read_message():
    """Read a message from the extension"""
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) == 0:
        return None
    message_length = struct.unpack('<I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)

def check_spz2ply_status():
    """Check SPZ2PLY conversion system status"""
    try:
        # Get current script directory
        current_dir = Path(__file__).parent.parent
        spz2ply_dir = current_dir / 'spz2ply'
        
        status = {
            'available': False,
            'directory_exists': False,
            'import_dir_exists': False,
            'export_dir_exists': False,
            'node_modules_exists': False,
            'package_json_exists': False,
            'auto_convert_exists': False,
            'run_bat_exists': False,
            'import_files_count': 0,
            'export_files_count': 0,
            'error': None
        }
        
        # Check directory structure
        if spz2ply_dir.exists():
            status['directory_exists'] = True
            
            # Check subdirectories
            import_dir = spz2ply_dir / 'import'
            export_dir = spz2ply_dir / 'export'
            
            if import_dir.exists():
                status['import_dir_exists'] = True
                # Count SPZ files in import directory
                spz_files = list(import_dir.glob('*.spz'))
                status['import_files_count'] = len(spz_files)
            
            if export_dir.exists():
                status['export_dir_exists'] = True
                # Count PLY files in export directory
                ply_files = list(export_dir.glob('*.ply'))
                status['export_files_count'] = len(ply_files)
            
            # Check required files
            if (spz2ply_dir / 'node_modules').exists():
                status['node_modules_exists'] = True
            
            if (spz2ply_dir / 'package.json').exists():
                status['package_json_exists'] = True
            
            if (spz2ply_dir / 'auto-convert.js').exists():
                status['auto_convert_exists'] = True
                
            if (spz2ply_dir / 'run.bat').exists():
                status['run_bat_exists'] = True
            
            # Overall availability check
            status['available'] = (
                status['directory_exists'] and
                status['import_dir_exists'] and
                status['export_dir_exists'] and
                status['node_modules_exists'] and
                status['package_json_exists'] and
                status['auto_convert_exists'] and
                status['run_bat_exists']
            )
        
        return status
        
    except Exception as e:
        return {
            'available': False,
            'error': str(e)
        }

def run_spz2ply_conversion():
    """Run SPZ2PLY conversion process"""
    try:
        current_dir = Path(__file__).parent.parent
        spz2ply_dir = current_dir / 'spz2ply'
        run_bat = spz2ply_dir / 'run.bat'
        
        if not run_bat.exists():
            return {
                'success': False,
                'error': 'run.bat not found'
            }
        
        # Run conversion process
        result = subprocess.run(
            [str(run_bat)],
            cwd=str(spz2ply_dir),
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        return {
            'success': result.returncode == 0,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'returncode': result.returncode
        }
        
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': 'Conversion process timed out'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def main():
    """Main message loop"""
    try:
        while True:
            message = read_message()
            if message is None:
                break
            
            action = message.get('action', '')
            
            if action == 'checkSpz2ply':
                response = check_spz2ply_status()
                send_message(response)
                
            elif action == 'runSpz2ply':
                response = run_spz2ply_conversion()
                send_message(response)
                
            else:
                send_message({
                    'error': f'Unknown action: {action}'
                })
                
    except Exception as e:
        send_message({
            'error': f'Native host error: {str(e)}'
        })

if __name__ == '__main__':
    main()
