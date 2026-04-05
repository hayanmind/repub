#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ePubRemaster — Sigil Plugin
AI-powered ePub 2.0 → 3.0 interactive remastering.

This plugin converts ePub 2.0 files to ePub 3.0 with:
  - Semantic HTML5 restructuring
  - KWCAG 2.1 accessibility auto-tagging
  - AI quiz generation (optional, requires API key)
  - TTS audio + SMIL media overlay (optional)
  - Chapter summaries (optional)

It works in two modes:
  1. API mode: Sends the ePub to a remote server for processing
  2. Local mode: Calls the @gov-epub/core CLI directly (requires Node.js)
"""

import os
import sys
import json
import tempfile
import zipfile
import shutil

# Sigil plugin type: output (creates new file, preserves original)
PLUGIN_TYPE = 'output'


def run(bk):
    """Main entry point called by Sigil."""

    # Load preferences
    prefs = bk.getPrefs()
    prefs.setdefault('mode', 'api')  # 'api' or 'local'
    prefs.setdefault('api_url', 'https://epub-remaster.vercel.app')
    prefs.setdefault('enable_quiz', True)
    prefs.setdefault('enable_tts', False)
    prefs.setdefault('enable_summary', True)
    prefs.setdefault('enable_image_gen', False)
    prefs.setdefault('node_path', 'node')  # for local mode

    # Show settings dialog
    if not show_settings_dialog(prefs):
        print('Cancelled by user.')
        return 0

    bk.savePrefs(prefs)

    # Create temporary directory and export current ePub
    tmpdir = tempfile.mkdtemp(prefix='epub_remaster_')
    try:
        # Export book contents to temp dir
        bk.copy_book_contents_to(tmpdir)

        # Create ePub from exported contents
        input_epub = os.path.join(tmpdir, 'input.epub')
        output_epub = os.path.join(tmpdir, 'output.epub')
        create_epub_from_sigil_export(tmpdir, input_epub)

        # Convert
        if prefs['mode'] == 'api':
            success = convert_via_api(input_epub, output_epub, prefs)
        else:
            success = convert_via_cli(input_epub, output_epub, prefs)

        if not success:
            print('Conversion failed.')
            return 1

        # Report results
        report_path = os.path.join(tmpdir, 'report.json')
        if os.path.exists(report_path):
            with open(report_path, 'r', encoding='utf-8') as f:
                report = json.load(f)
            print_report(report)

        # Output the converted ePub
        # For output plugins, we write to the output container
        if hasattr(bk, 'addotherfile'):
            bk.addotherfile(output_epub)
        print(f'\nConverted ePub saved: {output_epub}')
        print('Open the output file in Sigil to review changes.')

    finally:
        # Cleanup
        try:
            shutil.rmtree(tmpdir, ignore_errors=True)
        except Exception:
            pass

    return 0


def show_settings_dialog(prefs):
    """Show a Tkinter settings dialog."""
    try:
        import tkinter as tk
        from tkinter import ttk
    except ImportError:
        # If Tkinter not available, use defaults
        print('Tkinter not available, using default settings.')
        return True

    root = tk.Tk()
    root.title('ePub Remaster Settings')
    root.geometry('420x380')
    root.resizable(False, False)

    result = {'ok': False}

    # Mode selection
    frame = ttk.LabelFrame(root, text='Conversion Mode', padding=10)
    frame.pack(fill='x', padx=10, pady=5)

    mode_var = tk.StringVar(value=prefs['mode'])
    ttk.Radiobutton(frame, text='API (recommended)', variable=mode_var, value='api').pack(anchor='w')
    ttk.Radiobutton(frame, text='Local (requires Node.js)', variable=mode_var, value='local').pack(anchor='w')

    # API URL
    url_frame = ttk.LabelFrame(root, text='API Server URL', padding=10)
    url_frame.pack(fill='x', padx=10, pady=5)
    url_var = tk.StringVar(value=prefs['api_url'])
    ttk.Entry(url_frame, textvariable=url_var, width=50).pack(fill='x')

    # Options
    opt_frame = ttk.LabelFrame(root, text='Conversion Options', padding=10)
    opt_frame.pack(fill='x', padx=10, pady=5)

    quiz_var = tk.BooleanVar(value=prefs['enable_quiz'])
    tts_var = tk.BooleanVar(value=prefs['enable_tts'])
    summary_var = tk.BooleanVar(value=prefs['enable_summary'])
    imggen_var = tk.BooleanVar(value=prefs['enable_image_gen'])

    ttk.Checkbutton(opt_frame, text='AI Quiz Generation', variable=quiz_var).pack(anchor='w')
    ttk.Checkbutton(opt_frame, text='TTS + Media Overlay', variable=tts_var).pack(anchor='w')
    ttk.Checkbutton(opt_frame, text='Chapter Summaries', variable=summary_var).pack(anchor='w')
    ttk.Checkbutton(opt_frame, text='AI Image Generation', variable=imggen_var).pack(anchor='w')

    # Buttons
    btn_frame = ttk.Frame(root, padding=10)
    btn_frame.pack(fill='x')

    def on_ok():
        prefs['mode'] = mode_var.get()
        prefs['api_url'] = url_var.get()
        prefs['enable_quiz'] = quiz_var.get()
        prefs['enable_tts'] = tts_var.get()
        prefs['enable_summary'] = summary_var.get()
        prefs['enable_image_gen'] = imggen_var.get()
        result['ok'] = True
        root.destroy()

    def on_cancel():
        root.destroy()

    ttk.Button(btn_frame, text='Convert', command=on_ok).pack(side='right', padx=5)
    ttk.Button(btn_frame, text='Cancel', command=on_cancel).pack(side='right')

    root.mainloop()
    return result['ok']


def create_epub_from_sigil_export(export_dir, output_path):
    """Create a valid ePub ZIP from Sigil's exported directory structure."""
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        # mimetype must be first and uncompressed
        mimetype_path = os.path.join(export_dir, 'mimetype')
        if os.path.exists(mimetype_path):
            zf.write(mimetype_path, 'mimetype', compress_type=zipfile.ZIP_STORED)

        for root, dirs, files in os.walk(export_dir):
            for fname in files:
                if fname == 'mimetype':
                    continue
                full_path = os.path.join(root, fname)
                arc_name = os.path.relpath(full_path, export_dir)
                zf.write(full_path, arc_name)


def convert_via_api(input_path, output_path, prefs):
    """Convert ePub via REST API."""
    import urllib.request
    import urllib.error

    api_url = prefs['api_url'].rstrip('/')

    try:
        # 1. Upload
        print(f'Uploading to {api_url}...')
        boundary = '----EpubRemasterBoundary'
        with open(input_path, 'rb') as f:
            file_data = f.read()

        filename = os.path.basename(input_path)
        body = (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            f'Content-Type: application/epub+zip\r\n\r\n'
        ).encode('utf-8') + file_data + f'\r\n--{boundary}--\r\n'.encode('utf-8')

        req = urllib.request.Request(
            f'{api_url}/api/upload',
            data=body,
            headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            upload_result = json.loads(resp.read())
        upload_id = upload_result['id']
        print(f'Upload complete: {upload_id}')

        # 2. Start conversion
        options = {
            'enableQuiz': prefs['enable_quiz'],
            'enableTts': prefs['enable_tts'],
            'enableSummary': prefs['enable_summary'],
            'enableImageGen': prefs['enable_image_gen'],
        }
        conv_body = json.dumps({'options': options}).encode('utf-8')
        req = urllib.request.Request(
            f'{api_url}/api/convert/{upload_id}',
            data=conv_body,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            conv_result = json.loads(resp.read())
        job_id = conv_result['jobId']
        print(f'Conversion complete: {conv_result["status"]}')

        # 3. Download result
        req = urllib.request.Request(f'{api_url}/api/download/{job_id}')
        with urllib.request.urlopen(req, timeout=60) as resp:
            with open(output_path, 'wb') as f:
                f.write(resp.read())

        # 4. Get report
        try:
            req = urllib.request.Request(f'{api_url}/api/report/{job_id}')
            with urllib.request.urlopen(req, timeout=10) as resp:
                report = json.loads(resp.read())
            report_path = os.path.join(os.path.dirname(output_path), 'report.json')
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

        return True

    except urllib.error.URLError as e:
        print(f'API Error: {e}')
        print('Tip: Make sure the API server is running.')
        return False
    except Exception as e:
        print(f'Error: {e}')
        return False


def convert_via_cli(input_path, output_path, prefs):
    """Convert ePub via local @gov-epub/core CLI."""
    import subprocess

    node_path = prefs.get('node_path', 'node')

    cmd = [
        'npx', '@gov-epub/core', 'convert',
        input_path, '-o', output_path,
        '--format', 'json',
    ]
    if prefs['enable_quiz']:
        cmd.append('--quiz')
    if prefs['enable_tts']:
        cmd.append('--tts')
    if prefs['enable_summary']:
        cmd.append('--summary')
    if prefs['enable_image_gen']:
        cmd.append('--image-gen')

    print(f'Running: {" ".join(cmd)}')
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            # Save report
            try:
                report = json.loads(result.stdout)
                report_path = os.path.join(os.path.dirname(output_path), 'report.json')
                with open(report_path, 'w', encoding='utf-8') as f:
                    json.dump(report, f, ensure_ascii=False, indent=2)
            except json.JSONDecodeError:
                print(result.stdout)
            return True
        else:
            print(f'CLI Error: {result.stderr}')
            return False
    except FileNotFoundError:
        print('Error: npx not found. Is Node.js installed?')
        return False
    except subprocess.TimeoutExpired:
        print('Error: Conversion timed out (120s)')
        return False


def print_report(report):
    """Print conversion report summary."""
    r = report.get('report', report)
    print('\n' + '=' * 40)
    print('  Conversion Report')
    print('=' * 40)
    if 'epubcheckPassed' in r:
        print(f'  ePubCheck: {"PASS" if r["epubcheckPassed"] else "FAIL"}')
        print(f'  Errors: {r.get("epubcheckErrors", 0)}')
        print(f'  Accessibility: {r.get("accessibilityScore", "N/A")}')
    elif 'epubcheck' in r:
        ec = r['epubcheck']
        print(f'  ePubCheck: {"PASS" if ec.get("passed") else "FAIL"}')
        print(f'  Errors: {ec.get("errors", 0)}')
    print('=' * 40)


def main():
    print('This is a Sigil plugin. Install it via Sigil > Plugins > Manage Plugins.')
    print('Or run @gov-epub/core CLI directly:')
    print('  npx @gov-epub/core convert input.epub -o output.epub')


if __name__ == '__main__':
    main()
