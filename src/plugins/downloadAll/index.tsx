/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Menu } from "@webpack/common";

const settings = definePluginSettings({
    delay: {
        type: OptionType.NUMBER,
        description: "Delay between downloads in ms (to avoid rate limits or idk)",
        default: 300
    }
});

async function downloadAsZip(attachments) {
    const JSZip = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm").then(m => m.default);
    
    const zip = new JSZip();
    
    for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
        try {
            const response = await fetch(attachment.url);
            const blob = await response.blob();
            zip.file(attachment.filename || `attachment_${i}`, blob);
        } catch (error) {
            console.error(`[DownloadAll] Error: ${attachment.filename}`, error);
        }
    }
    
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(zipBlob);
    
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `discord_attachments_${Date.now()}.zip`;
    
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}

async function downloadIndividually(attachments) {
    for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
        try {
            const response = await fetch(attachment.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = attachment.filename || `attachment_${i}`;
            
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
            
            if (i < attachments.length - 1) {
                await new Promise(resolve => setTimeout(resolve, settings.store.delay));
            }
        } catch (error) {
            console.error(`[DownloadAll] Error: ${attachment.filename}`, error);
        }
    }
}

export default definePlugin({
    name: "DownloadAll",
    description: "Download all attachments from a message at once. Right-click on a message and select the download method you want.",
    authors: [{
        name: "Chad",
        id: 979836807141281883n
    }],

    settings,

    contextMenus: {
        "message": (children, props) => {
            const message = props?.message;
            
            let allAttachments = [];
            
            if (message?.attachments && message.attachments.length > 0) {
                allAttachments = [...message.attachments];
            }
            
            if (message?.messageReference || message?.messageSnapshots) {
                const snapshots = message.messageSnapshots || [];
                snapshots.forEach(snapshot => {
                    if (snapshot?.message?.attachments) {
                        allAttachments.push(...snapshot.message.attachments);
                    }
                });
            }
            
            if (allAttachments.length <= 1) return;

            children.push(
                <Menu.MenuItem
                    id="vc-download-all"
                    label={`Download all attachments (${allAttachments.length} files)`}
                >
                    <Menu.MenuItem
                        id="vc-download-zip"
                        label="As ZIP file (1 download)"
                        action={async () => {
                            try {
                                await downloadAsZip(allAttachments);
                            } catch (error) {
                                console.error("[DownloadAll] ZIP error:", error);
                                alert("Error making ZIP file. Check console for details and try again with 1 by 1.");
                            }
                        }}
                    />
                    <Menu.MenuItem
                        id="vc-download-individual"
                        label="Download 1 by 1 (multiple downloads, will open multiple download windows!!!)"
                        action={() => downloadIndividually(allAttachments)}
                    />
                </Menu.MenuItem>
            );
        }
    }
});
