
"use strict";

// ======================================
// SUPABASE CONNECTION
// ======================================

const SUPABASE_URL = "https://hxtwdzvnqtxoutdetfoy.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_hEot0ds6XIcLYo7Fj8xtUQ_0ICFxMBV";

const larckSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

// ======================================
// PAGE ELEMENTS
// ======================================

const loginScreen = document.getElementById("loginScreen");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const adminEmailInput = document.getElementById("adminEmail");
const adminPasswordInput = document.getElementById("adminPassword");
const togglePassword = document.getElementById("togglePassword");
const adminEmailDisplay = document.getElementById("adminEmailDisplay");
const logoutButton = document.getElementById("logoutButton");
const sidebar = document.getElementById("sidebar");
const menuButton = document.getElementById("menuButton");
const pageTitle = document.getElementById("pageTitle");
const sectionContent = document.getElementById("sectionContent");

// ======================================
// PASSWORD VISIBILITY
// ======================================

togglePassword.addEventListener("click", function () {
    const isHidden = adminPasswordInput.type === "password";

    adminPasswordInput.type = isHidden ? "text" : "password";
    togglePassword.textContent = isHidden ? "Hide" : "Show";
});

// ======================================
// SHOW ADMIN DASHBOARD
// ======================================

function showDashboard(user) {
    loginScreen.hidden = true;
    dashboard.hidden = false;

    adminEmailDisplay.textContent = user.email || "Admin";
    adminEmailDisplay.title = user.email || "";

    showSection("overview");
}

// ======================================
// SHOW LOGIN SCREEN
// ======================================

function showLogin(message = "") {
    dashboard.hidden = true;
    loginScreen.hidden = false;
    loginMessage.textContent = message;
    adminPasswordInput.value = "";
}

// ======================================
// CHECK ADMIN PERMISSION
// ======================================

async function verifyAdmin(user) {
    if (!user || !user.id) {
        return false;
    }

    const { data, error } = await larckSupabase
        .from("control_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Admin verification failed:", error);
        throw new Error(
            "Could not verify administrator access. Please check your connection and Supabase permissions."
        );
    }

    return Boolean(data);
}

// ======================================
// EMAIL AND PASSWORD LOGIN
// ======================================

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value;

    if (!email || !password) {
        loginMessage.textContent = "Enter your admin email and password.";
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Checking access...";
    loginMessage.textContent = "";

    try {
        const { data, error } = await larckSupabase.auth
            .signInWithPassword({
                email: email,
                password: password
            });

        if (error) {
            throw error;
        }

        if (!data.user) {
            throw new Error("We could not verify your account.");
        }

        const isAdmin = await verifyAdmin(data.user);

        if (!isAdmin) {
            await larckSupabase.auth.signOut();

            showLogin(
                "This account is not authorized to access LARCK Control."
            );

            return;
        }

        showDashboard(data.user);

    } catch (error) {
        console.error("LARCK Control login error:", error);

        showLogin(
            error.message ||
            "Unable to sign in. Please try again."
        );

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Sign in to Control";
    }
});

// ======================================
// DASHBOARD SECTIONS
// ======================================

const sectionDetails = {
    overview: {
        title: "Overview",
        heading: "Platform Overview",
        description: "Your administration workspace at a glance."
    },
    users: {
        title: "User Management",
        heading: "User Management",
        description: "This section will connect to LARCK profiles."
    },

    "bd-space": {
    title: "BD Space",
    heading: "BD Space",
    description: "Appoint LARCK users as agency owners and manage your agencies."
    },

    announcements: {
        title: "Announcements",
        heading: "LARCK Announcements",
        description: "This section will manage official LARCK Team updates."
    },
    moderation: {
        title: "Moderation",
        heading: "Platform Moderation",
        description: "Tools for reviewing and managing platform safety."
    },
    reports: {
        title: "Reports",
        heading: "Reports",
        description: "A workspace for user reports and support issues."
    },
    activity: {
        title: "Activity & Games",
        heading: "Activity & Games",
        description: "Manage the Activity and Games features."
    },

        banners: {
        title: "Home Banners",
        heading: "Home Banners",
        description: "Upload and manage the images displayed in the LARCK Home carousel."
    },
    
    "coin-reserve": {
    title: "Coin Reserve",
    heading: "LARCK Coin Reserve",
     description: "Initialize and inspect the platform's coin reserve."
     },

     coinControl: {
    title: "Coin Control",
    heading: "LARCK Coin Control",
    description: "Manage customer and seller coin payments."
    },
    settings: {
        title: "Settings",
        heading: "Control Settings",
        description: "Administrative settings will be added here."
    }
};




function escapeUserText(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char];
    });
}



/* ======================================
   BD SPACE — AGENCY OWNER MANAGEMENT
====================================== */


let bdSelectedUser = null;

function renderBDSpace() {
    const content = document.getElementById("sectionContent");
    if (!content) return;

    content.innerHTML = `
        <div class="bd-space">
            <div class="bd-search-card">
               <h3>Invite Agency Owner</h3>
                <p>Search for a LARCK user by their LARCK ID and invite them to become an agency owner.</p>
                <form id="bdSearchForm">
                    <label for="bdLarckId">LARCK ID</label>
                    <div class="bd-search-row">
                        <input
                            id="bdLarckId"
                            type="text"
                            inputmode="numeric"
                            maxlength="7"
                            placeholder="Enter LARCK ID"
                            required
                        >
                        <button type="submit">Search</button>
                    </div>
                </form>

                <div id="bdUserResult"></div>
            </div>

            <div class="bd-agencies-card">
                <div class="bd-agencies-heading">
                    <h3>Appointed Agencies</h3>
                    <button type="button" id="bdRefreshButton">Refresh</button>
                </div>
                <div id="bdAgenciesList">Loading agencies...</div>
            </div>
        </div>
    `;

    document.getElementById("bdSearchForm")
        .addEventListener("submit", searchBDUser);

    document.getElementById("bdRefreshButton")
        .addEventListener("click", loadBDAgencies);

    loadBDAgencies();
}

async function searchBDUser(event) {
    event.preventDefault();

    const larckId = document.getElementById("bdLarckId").value.trim();
    const result = document.getElementById("bdUserResult");

    bdSelectedUser = null;

    if (!/^\d{7}$/.test(larckId)) {
        result.innerHTML = "<p>Enter a valid seven-digit LARCK ID.</p>";
        return;
    }

    result.innerHTML = "<p>Searching for user...</p>";

    const { data, error } = await larckSupabase
        .from("profiles")
        .select("username, profile_picture, larck_id, country")
        .eq("larck_id", larckId)
        .maybeSingle();

    if (error) {
        console.error("BD Space user search error:", error);
        result.innerHTML = "<p>Unable to search right now. Please try again.</p>";
        return;
    }

    if (!data) {
        result.innerHTML = "<p>No user found with that LARCK ID.</p>";
        return;
    }

    bdSelectedUser = data;

    const username = escapeUserText(data.username || "LARCK User");
    const country = escapeUserText(data.country || "Not provided");
    const profilePicture = escapeUserText(data.profile_picture || "");
    const profileImage = profilePicture
        ? `<img src="${profilePicture}" alt="Profile picture"
               class="bd-user-avatar">`
        : `<div class="bd-user-avatar bd-avatar-placeholder">
               ${username.charAt(0).toUpperCase()}
           </div>`;

    result.innerHTML = `
        <div class="bd-user-result">
            ${profileImage}
            <div class="bd-user-details">
                <strong>${username}</strong>
                <span>LARCK ID: ${escapeUserText(data.larck_id)}</span>
                <span>${country}</span>
            </div>
            <button type="button" id="bdAppointButton">
    Send Invitation
</button>
        </div>
    `;

   document.getElementById("bdAppointButton")
    .addEventListener("click", sendBDInvitation);
}


async function sendBDInvitation() {
    if (!bdSelectedUser) return;

    const button = document.getElementById("bdAppointButton");
    const result = document.getElementById("bdUserResult");

    if (!button || !result) return;

    const selectedUser = { ...bdSelectedUser };

    const confirmed = window.confirm(
        `Send an agency-owner invitation to ${
            selectedUser.username || "this user"
        } (LARCK ID: ${selectedUser.larck_id})?`
    );

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = "Sending...";

    try {
        const { data, error } = await larckSupabase.rpc(
            "send_agency_owner_invitation",
            {
                p_larck_id: selectedUser.larck_id
            }
        );

        if (error) throw error;

        result.innerHTML = `
            <div class="bd-success">
                <h4>Invitation sent successfully!</h4>
                <p>
                    An agency-owner invitation has been sent to
                    <strong>${escapeUserText(
                        selectedUser.username || "this user"
                    )}</strong>.
                </p>
                <p>
                    <strong>LARCK ID:</strong>
                    ${escapeUserText(selectedUser.larck_id)}
                </p>
                <p>
                    The agency will only be created if the user accepts.
                </p>
            </div>
        `;

        bdSelectedUser = null;

    } catch (error) {
        console.error("Agency invitation error:", error);

        const errorMessage = document.createElement("p");
        errorMessage.className = "bd-error";
        errorMessage.textContent =
            error.message || "Could not send the invitation. Please try again.";

        result.appendChild(errorMessage);

        button.disabled = false;
        button.textContent = "Send Invitation";
    }
}


async function loadBDAgencies() {
    const list = document.getElementById("bdAgenciesList");
    if (!list) return;

    list.innerHTML = "<p>Loading agencies...</p>";

    const { data, error } = await larckSupabase
        .from("agencies")
        .select("username, agency_id, created_at")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Load agencies error:", error);
        list.innerHTML = "<p>Unable to load agencies. Check your access policies.</p>";
        return;
    }

    if (!data || data.length === 0) {
        list.innerHTML = "<p>No agencies have been appointed yet.</p>";
        return;
    }

    list.innerHTML = data.map((agency) => `
        <div class="bd-agency-row">
            <div>
                <strong>${escapeUserText(agency.username || "Agency Owner")}</strong>
                <p>Agency ID: ${escapeUserText(agency.agency_id)}</p>
                <small>${agency.created_at
                    ? escapeUserText(new Date(agency.created_at).toLocaleDateString())
                    : ""}</small>
            </div>
            <button
                type="button"
                class="bd-copy-agency-id"
                data-agency-id="${escapeUserText(agency.agency_id)}"
            >Copy ID</button>
        </div>
    `).join("");

    list.querySelectorAll(".bd-copy-agency-id").forEach((button) => {
        button.addEventListener("click", async () => {
            const agencyId = button.dataset.agencyId;

            try {
                await navigator.clipboard.writeText(agencyId);
                button.textContent = "Copied!";
            } catch (error) {
                window.prompt("Copy this Agency ID:", agencyId);
            }
        });
    });
}





/* ======================================
   REPORTS & SUPPORT
====================================== */

let loadedReports = [];
let loadedTickets = [];
let supportView = "reports";

function renderReportsSection() {
    sectionContent.innerHTML = `
        <div class="section-heading">
            <div>
                <h3>Reports & Support</h3>
                <p>Review user reports and respond to support requests.</p>
            </div>
            <button type="button" id="refreshReportsButton">Refresh</button>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;">
            <button type="button" data-support-view="reports"
                style="padding:11px 16px;border:0;border-radius:10px;background:#08c9c5;color:white;font-weight:600;cursor:pointer;">
                User Reports
            </button>
            <button type="button" data-support-view="tickets"
                style="padding:11px 16px;border:1px solid #ddd;border-radius:10px;background:white;cursor:pointer;">
                Support Tickets
            </button>
        </div>

        <section class="activity-panel">
            <div style="padding:18px;">
                <input id="reportSearchInput" type="search"
                    placeholder="Search reports or support requests..."
                    aria-label="Search reports and support requests"
                    style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #ddd;border-radius:10px;margin-bottom:12px;">

                <select id="reportStatusFilter"
                    aria-label="Filter by status"
                    style="width:100%;padding:12px;border:1px solid #ddd;border-radius:10px;margin-bottom:16px;">
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                </select>

                <p id="reportsStatus" role="status">Loading...</p>
                <div id="reportsList"></div>
            </div>
        </section>
    `;

    supportView = "reports";
    loadReportsAndTickets();
}

function reportEscape(value) {
    return escapeUserText(value);
}

function reportDate(value) {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : date.toLocaleString();
}

async function loadReportsAndTickets() {
    const status = document.getElementById("reportsStatus");
    const list = document.getElementById("reportsList");

    if (!status || !list) return;

    status.textContent = "Loading reports and support tickets...";
    list.innerHTML = "";

    try {
       const [reportsResult, ticketsResult] = await Promise.all([
    larckSupabase
        .from("user_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),

    larckSupabase
        .from("support_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500)
]);
        if (reportsResult.error) throw reportsResult.error;
        if (ticketsResult.error) throw ticketsResult.error;

        loadedReports = reportsResult.data || [];
        loadedTickets = ticketsResult.data || [];

        renderReportsList();
    } catch (error) {
        console.error("Could not load Reports & Support:", error);
        status.textContent =
            "Could not load records. Check your Supabase permissions and try Refresh.";
        list.innerHTML = "";
    }
}

function renderReportsList() {
    const status = document.getElementById("reportsStatus");
    const list = document.getElementById("reportsList");
    const search = document.getElementById("reportSearchInput");
    const filter = document.getElementById("reportStatusFilter");

    if (!status || !list) return;

    const isTickets = supportView === "tickets";
    const records = isTickets ? loadedTickets : loadedReports;
    const term = (search?.value || "").trim().toLowerCase();
    const selectedStatus = filter?.value || "all";

    const filtered = records.filter(function (item) {
       
        const searchable = isTickets
            ? [
                item.contact,
                item.category,
                item.message,
                item.status
            ]
            : [
                item.category,
                item.description,
                item.status,
                item.admin_notes
            ];

        const matchesText = searchable.some(function (value) {
            return String(value || "").toLowerCase().includes(term);
        });

        const matchesStatus =
            selectedStatus === "all" || item.status === selectedStatus;

        return matchesText && matchesStatus;
    });

    status.textContent =
        `${filtered.length} ${isTickets ? "support ticket(s)" : "report(s)"}`;

    if (!filtered.length) {
        list.innerHTML = `<p>No matching ${isTickets ? "support tickets" : "reports"} found.</p>`;
        return;
    }

    list.innerHTML = filtered.map(function (item) {
        const id = reportEscape(item.id);
       
        const title = isTickets
            ? reportEscape(item.category || "Support request")
            : reportEscape(item.category || "Other");

        const description = reportEscape(
            item.message || item.description || ""
        );

        const contact = isTickets
            ? reportEscape(item.contact || "Not provided")
            : "";

        const date = reportEscape(reportDate(item.created_at));
        const currentStatus = item.status || (isTickets ? "open" : "pending");
        const reply = "";
        const notes = reportEscape(item.admin_notes || "");

        const attachments = isTickets
            ? [
                ...(Array.isArray(item.attachment_paths)
                    ? item.attachment_paths
                    : []),
                ...(item.attachment_url ? [item.attachment_url] : [])
              ]
            : [];

        const statusOptions = isTickets
            ? [
                ["open", "Open"],
                ["in_progress", "In progress"],
                ["resolved", "Resolved"],
                ["closed", "Closed"]
            ]
            : [
                ["pending", "Pending"],
                ["reviewing", "Reviewing"],
                ["resolved", "Resolved"],
                ["dismissed", "Dismissed"]
            ];

        const options = statusOptions.map(function (option) {
            return `<option value="${option[0]}" ${item.status === option[0] ? "selected" : ""}>${option[1]}</option>`;
        }).join("");

        return `
            <article style="border:1px solid #e8e8e8;border-radius:14px;padding:16px;margin-bottom:14px;">
                <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                    <strong>${title}</strong>
                    <small style="color:#777;">${date}</small>
                </div>

                 ${isTickets ? `
    <p><strong>Contact:</strong> ${contact}</p>
    ${attachments.length ? `
        <div class="support-attachments">
            <strong>Screenshots:</strong>
            <div id="support-images-${id}"
                 data-attachment-paths="${reportEscape(JSON.stringify(attachments))}">
                Loading screenshots...
            </div>
        </div>
    ` : `<p>No screenshots attached.</p>`}
` : ""}

              
<label style="display:block;margin-top:14px;font-weight:600;">
    Reply to user
</label>
<textarea
    data-ticket-reply="${id}"
    rows="3"
    placeholder="Type your reply to this user..."
    style="width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border:1px solid #ddd;border-radius:9px;"
>${reportEscape(item.admin_reply || "")}</textarea>

<button type="button"
    data-save-ticket="${id}"
    style="margin-top:10px;padding:10px 14px;border:0;border-radius:9px;background:#08c9c5;color:white;font-weight:600;cursor:pointer;">
    Send Reply
</button>



                <p style="line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;">${description}</p>

                <small style="color:#777;">Record ID: ${id}</small>

                <div style="margin-top:14px;">
                    <label style="display:block;margin-bottom:6px;font-weight:600;">Status</label>
                    <select data-record-status="${id}" data-record-type="${isTickets ? "ticket" : "report"}"
                        style="width:100%;padding:10px;border:1px solid #ddd;border-radius:9px;">
                        ${options}
                    </select>
                </div>

                ${isTickets ? `
                    <label style="display:block;margin-top:14px;font-weight:600;">Admin reply</label>
                    <textarea data-ticket-reply="${id}" rows="3"
                        placeholder="Write a response for the user..."
                        style="width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border:1px solid #ddd;border-radius:9px;">${reply}</textarea>
                    <button type="button" data-save-ticket="${id}"
                        style="margin-top:10px;padding:10px 14px;border:0;border-radius:9px;background:#08c9c5;color:white;font-weight:600;cursor:pointer;">
                        Save Status
                    </button>
                ` : `
                    <label style="display:block;margin-top:14px;font-weight:600;">Admin notes</label>
                    <textarea data-report-notes="${id}" rows="2"
                        placeholder="Internal notes for this report..."
                        style="width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border:1px solid #ddd;border-radius:9px;">${notes}</textarea>
                    <button type="button" data-save-report="${id}"
                        style="margin-top:10px;padding:10px 14px;border:0;border-radius:9px;background:#08c9c5;color:white;font-weight:600;cursor:pointer;">
                        Save Report
                    </button>
                `}
            </article>
        `;
    }).join("");

    if (isTickets) {
    loadSupportScreenshots();
}
}


async function saveReportRecord(id) {
    const statusInput = document.querySelector(
        `[data-record-status="${CSS.escape(id)}"][data-record-type="report"]`
    );
    const notesInput = document.querySelector(
        `[data-report-notes="${CSS.escape(id)}"]`
    );

    if (!statusInput || !notesInput) return;

    const button = document.querySelector(`[data-save-report="${CSS.escape(id)}"]`);
    if (button) {
        button.disabled = true;
        button.textContent = "Saving...";
    }

    try {
        const { error } = await larckSupabase
            .from("user_reports")
            .update({
                status: statusInput.value,
                admin_notes: notesInput.value.trim(),
                updated_at: new Date().toISOString()
            })
            .eq("id", id);

        if (error) throw error;

        await loadReportsAndTickets();
        alert("Report updated successfully.");
    } catch (error) {
        console.error("Could not update report:", error);
        alert("Could not save the report. Please try again.");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Save Report";
        }
    }
}



async function loadSupportScreenshots() {
    const containers = document.querySelectorAll(
        "[id^='support-images-'][data-attachment-paths]"
    );

    for (const container of containers) {
        try {
            const paths = JSON.parse(
                container.dataset.attachmentPaths || "[]"
            );

            container.replaceChildren();

            for (const path of paths) {
                const { data, error } = await larckSupabase.storage
                    .from("larck-support")
                    .createSignedUrl(path, 3600);

                if (error) throw error;

                const link = document.createElement("a");
                link.href = data.signedUrl;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = "Open screenshot";
                link.style.display = "inline-block";
                link.style.margin = "8px 8px 8px 0";

                const image = document.createElement("img");
                image.src = data.signedUrl;
                image.alt = "Support screenshot";
                image.loading = "lazy";
                image.style.cssText =
                    "display:block;max-width:100%;width:280px;" +
                    "max-height:320px;object-fit:contain;" +
                    "border-radius:10px;margin-top:8px;";

                const wrapper = document.createElement("div");
                wrapper.style.marginTop = "10px";
                wrapper.append(link, image);
                container.appendChild(wrapper);
            }

            if (!paths.length) {
                container.textContent = "No screenshots attached.";
            }
        } catch (error) {
            console.error("Could not load support screenshots:", error);
            container.textContent =
                "Could not load screenshot. Check Storage permissions.";
        }
    }
}




async function saveSupportTicket(id) {
    const statusInput = document.querySelector(
        `[data-record-status="${CSS.escape(id)}"][data-record-type="ticket"]`
    );

    const replyInput = document.querySelector(
        `[data-ticket-reply="${CSS.escape(id)}"]`
    );

    if (!statusInput || !replyInput) {
        alert("The support reply field could not be found.");
        return;
    }

    const reply = replyInput.value.trim();

    if (!reply) {
        alert("Please type a reply before sending.");
        return;
    }

    const button = document.querySelector(
        `[data-save-ticket="${CSS.escape(id)}"]`
    );

    if (button) {
        button.disabled = true;
        button.textContent = "Sending...";
    }

    try {
        const { error } = await larckSupabase
            .from("support_submissions")
            .update({
                status: statusInput.value,
                admin_reply: reply,
                admin_replied_at: new Date().toISOString(),
                reply_seen: false
            })
            .eq("id", id);

        if (error) throw error;

        await loadReportsAndTickets();
        alert("Support reply sent successfully.");
    } catch (error) {
        console.error("Could not send support reply:", error);
        alert("Could not send reply: " + error.message);
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Send Reply";
        }
    }
}


document.addEventListener("click", function (event) {
    const viewButton = event.target.closest("[data-support-view]");

    if (viewButton) {
        supportView = viewButton.dataset.supportView;

        const filter = document.getElementById("reportStatusFilter");
        if (filter) {
            filter.innerHTML = supportView === "tickets"
                ? `<option value="all">All statuses</option>
                   <option value="open">Open</option>
                   <option value="in_progress">In progress</option>
                   <option value="resolved">Resolved</option>
                   <option value="closed">Closed</option>`
                : `<option value="all">All statuses</option>
                   <option value="pending">Pending</option>
                   <option value="reviewing">Reviewing</option>
                   <option value="resolved">Resolved</option>
                   <option value="dismissed">Dismissed</option>`;
        }

        document.querySelectorAll("[data-support-view]").forEach(function (button) {
            const active = button.dataset.supportView === supportView;
            button.style.background = active ? "#08c9c5" : "white";
            button.style.color = active ? "white" : "#222";
            button.style.border = active ? "0" : "1px solid #ddd";
        });

        renderReportsList();
        return;
    }

    if (event.target.closest("#refreshReportsButton")) {
        loadReportsAndTickets();
        return;
    }

    const saveReportButton = event.target.closest("[data-save-report]");
    if (saveReportButton) {
        saveReportRecord(saveReportButton.dataset.saveReport);
        return;
    }

    const saveTicketButton = event.target.closest("[data-save-ticket]");
    if (saveTicketButton) {
        saveSupportTicket(saveTicketButton.dataset.saveTicket);
    }
});

document.addEventListener("input", function (event) {
    if (event.target.id === "reportSearchInput") {
        renderReportsList();
    }
});

document.addEventListener("change", function (event) {
    if (event.target.id === "reportStatusFilter") {
        renderReportsList();
    }
});


let loadedProfiles = [];
let userSearchTerm = "";

function renderUsersSection() {
    sectionContent.innerHTML = `
        <div class="section-heading">
            <div>
                <h3>User Management</h3>
                <p>View and search registered LARCK profiles.</p>
            </div>
            <button type="button" id="refreshUsersButton">
                Refresh
            </button>
        </div>

        <section class="activity-panel">
            <div style="padding: 18px;">
                <input
                    id="userSearchInput"
                    type="search"
                    placeholder="Search username or LARCK ID..."
                    value="${escapeUserText(userSearchTerm)}"
                    aria-label="Search users"
                    style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #ddd;border-radius:10px;margin-bottom:16px;"
                >

                <p id="usersStatus" role="status">Loading users...</p>
                <div id="usersList"></div>
            </div>
        </section>
    `;

    renderFilteredUsers();
    loadProfiles();
}


let displayedProfiles = [];

function renderFilteredUsers() {
    const list = document.getElementById("usersList");
    const status = document.getElementById("usersStatus");

    if (!list || !status) return;

    const term = userSearchTerm.trim().toLowerCase();

    displayedProfiles = loadedProfiles.filter(function (user) {
        return String(user.username || "").toLowerCase().includes(term) ||
            String(user.larck_id || "").toLowerCase().includes(term);
    });

    if (loadedProfiles.length === 0) {
        status.textContent = "No profiles found yet.";
        list.innerHTML = "";
        return;
    }

    status.textContent = `${displayedProfiles.length} user(s) shown`;

    if (displayedProfiles.length === 0) {
        list.innerHTML = "<p>No matching users found.</p>";
        return;
    }

    list.innerHTML = displayedProfiles.map(function (user, index) {
        const username = escapeUserText(user.username || "Unnamed user");
        const larckId = escapeUserText(user.larck_id || "Not assigned");
        const country = escapeUserText(user.country || "Not provided");
        const picture = String(user.profile_picture || "");

        const safePicture = /^https?:\/\/[^\s"'<>]+$/i.test(picture)
            ? escapeUserText(picture)
            : "";

        const avatar = safePicture
            ? `<img src="${safePicture}" alt="Profile picture"
                    style="width:48px;height:48px;border-radius:50%;object-fit:cover;"
                    onerror="this.style.display='none';">`
            : `<span style="display:grid;width:48px;height:48px;flex-shrink:0;border-radius:50%;background:#e6f9f8;place-items:center;color:#087f7c;font-weight:700;">
                    ${escapeUserText((user.username || "U").charAt(0).toUpperCase())}
               </span>`;

        return `
            <article style="display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid #eee;">
                ${avatar}

                <div style="min-width:0;flex:1;">
                    <strong>${username}</strong>
                    <p style="margin:5px 0;color:#666;font-size:13px;">
                        LARCK ID: ${larckId}
                    </p>
                    <p style="margin:0;color:#777;font-size:13px;">
                        ${country}
                    </p>
                </div>

                <button
                    type="button"
                    data-view-user="${index}"
                    style="border:0;border-radius:9px;padding:10px 12px;background:#08c9c5;color:#fff;font-weight:600;cursor:pointer;flex-shrink:0;"
                >
                    View Details
                </button>
            </article>
        `;
    }).join("");
}



function showUserDetails(index) {
    const user = displayedProfiles[index];

    if (!user) return;

    const username = escapeUserText(user.username || "Unnamed user");
    const larckId = escapeUserText(user.larck_id || "Not assigned");
    const country = escapeUserText(user.country || "Not provided");
    const picture = String(user.profile_picture || "");

    const safePicture = /^https?:\/\/[^\s"'<>]+$/i.test(picture)
        ? escapeUserText(picture)
        : "";

    const avatar = safePicture
        ? `<img src="${safePicture}" alt="Profile picture"
                style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:4px solid #e6f9f8;"
                onerror="this.style.display='none';">`
        : `<div style="width:100px;height:100px;border-radius:50%;background:#e6f9f8;display:grid;place-items:center;color:#087f7c;font-size:32px;font-weight:700;">
                ${escapeUserText((user.username || "U").charAt(0).toUpperCase())}
           </div>`;

    const list = document.getElementById("usersList");
    if (!list) return;

    list.innerHTML = `
        <div style="padding:20px 0;">
            <button
                type="button"
                id="backToUsersButton"
                style="border:1px solid #ddd;border-radius:9px;padding:10px 14px;background:#fff;cursor:pointer;margin-bottom:20px;"
            >
                ← Back to Users
            </button>

            <section style="border:1px solid #eee;border-radius:16px;padding:24px;text-align:center;">
                <div style="display:flex;justify-content:center;margin-bottom:14px;">
                    ${avatar}
                </div>

                <h2 style="margin:8px 0;font-size:22px;">
                    ${username}
                </h2>

                <p style="margin:0;color:#777;">
                    LARCK User Profile
                </p>

                <div style="text-align:left;margin-top:24px;">
                    <div style="padding:14px 0;border-bottom:1px solid #eee;">
                        <small style="color:#777;">Username</small>
                        <div style="font-weight:600;margin-top:5px;">${username}</div>
                    </div>

                    <div style="padding:14px 0;border-bottom:1px solid #eee;">
                        <small style="color:#777;">LARCK ID</small>
                        <div style="font-weight:600;margin-top:5px;">${larckId}</div>
                    </div>

                    <div style="padding:14px 0;border-bottom:1px solid #eee;">
                        <small style="color:#777;">Country</small>
                        <div style="font-weight:600;margin-top:5px;">${country}</div>
                    </div>

                    <div style="padding:14px 0;">
                        <small style="color:#777;">Profile Picture</small>
                        <div style="font-weight:600;margin-top:5px;">
                            ${safePicture ? "Picture available" : "No picture available"}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    `;

    const status = document.getElementById("usersStatus");
    if (status) status.textContent = "Viewing user details";
}




async function loadProfiles() {
    const status = document.getElementById("usersStatus");
    const list = document.getElementById("usersList");
    const refreshButton = document.getElementById("refreshUsersButton");

    if (!status || !list) return;

    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = "Loading...";
    }

    status.textContent = "Loading users...";
    list.innerHTML = "";

    try {
        const { data, error } = await larckSupabase
            .from("profiles")
            .select("username, profile_picture, larck_id, country")
            .order("username", { ascending: true })
            .limit(1000);

        if (error) throw error;

        loadedProfiles = data || [];
        renderFilteredUsers();

        if (loadedProfiles.length === 1000) {
            status.textContent =
                "Showing up to 1,000 profiles. Contact us to add pagination if needed.";
        }

        if (loadedProfiles.length === 0) {
            status.textContent = "No profiles found yet.";
        }
    } catch (error) {
        console.error("Could not load LARCK profiles:", error);
        status.textContent =
            "Could not load users. Check your Supabase permissions and try Refresh.";
        list.innerHTML = "";
    } finally {
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.textContent = "Refresh";
        }
    }
}



async function loadOverviewStats() {
    const totalUsersElement = document.getElementById("totalUsersStat");
    const announcementsElement = document.getElementById("announcementsStat");

    if (!totalUsersElement || !announcementsElement) return;

    totalUsersElement.textContent = "Loading...";
    announcementsElement.textContent = "Loading...";

    // Count registered LARCK profiles.
    try {
        const { count, error } = await larckSupabase
            .from("profiles")
            .select("*", { count: "exact", head: true });

        if (error) throw error;

        totalUsersElement.textContent =
            Number(count ?? 0).toLocaleString();
    } catch (error) {
        console.error("Could not count LARCK users:", error);
        totalUsersElement.textContent = "Unavailable";
    }

    // Count official LARCK Team announcements.
    try {
        const { count, error } = await larckSupabase
            .from("team_announcements")
            .select("*", { count: "exact", head: true });

        if (error) throw error;

        announcementsElement.textContent =
            Number(count ?? 0).toLocaleString();
    } catch (error) {
        console.error("Could not count announcements:", error);
        announcementsElement.textContent = "Unavailable";
    }
}



/* ======================================
   HOME BANNERS MANAGER
====================================== */

let loadedHomeBanners = [];

function renderBannersSection() {
    sectionContent.innerHTML = `
        <div class="section-heading">
            <div>
                <h3>Home Banners</h3>
                <p>Upload and manage the pictures shown in your Home carousel.</p>
            </div>
            <button type="button" id="refreshBannersButton">Refresh</button>
        </div>

        <section class="activity-panel" style="padding:20px;margin-bottom:20px;">
            <h3 style="margin-top:0;">Upload New Banner</h3>

            <form id="homeBannerForm">
                <label for="bannerTitle">Banner title</label>
                <input
                    id="bannerTitle"
                    type="text"
                    maxlength="120"
                    placeholder="Enter banner title"
                    style="display:block;width:100%;box-sizing:border-box;padding:12px;margin:8px 0 16px;border:1px solid #ddd;border-radius:10px;"
                >

                <label for="bannerImage">Choose banner picture</label>
                <input
                    id="bannerImage"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    required
                    style="display:block;width:100%;box-sizing:border-box;margin:8px 0 16px;"
                >

                <label for="bannerOrder">Display order</label>
                <input
                    id="bannerOrder"
                    type="number"
                    min="0"
                    step="1"
                    value="0"
                    required
                    style="display:block;width:100%;box-sizing:border-box;padding:12px;margin:8px 0 16px;border:1px solid #ddd;border-radius:10px;"
                >

                <label style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
                    <input id="bannerActive" type="checkbox" checked>
                    Display this banner on Home
                </label>

                <button
                    type="submit"
                    id="uploadBannerButton"
                    style="padding:12px 18px;border:0;border-radius:10px;background:#08c9c5;color:white;font-weight:600;cursor:pointer;"
                >Upload Banner</button>

                <p id="bannerFormMessage" role="status" style="overflow-wrap:anywhere;"></p>
            </form>
        </section>

        <section class="activity-panel" style="padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                <h3 style="margin:0;">Your Banners</h3>
                <span id="bannerCount"></span>
            </div>
            <p id="bannerListMessage" role="status">Loading banners...</p>
            <div id="homeBannersList"></div>
        </section>
    `;

    document.getElementById("homeBannerForm")
        .addEventListener("submit", uploadHomeBanner);

    document.getElementById("refreshBannersButton")
        .addEventListener("click", loadHomeBanners);

    loadHomeBanners();
}

async function loadHomeBanners() {
    const list = document.getElementById("homeBannersList");
    const message = document.getElementById("bannerListMessage");
    const count = document.getElementById("bannerCount");
    const refreshButton = document.getElementById("refreshBannersButton");

    if (!list || !message) return;

    message.textContent = "Loading banners...";
    list.innerHTML = "";

    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = "Loading...";
    }

    try {
        const { data, error } = await larckSupabase
            .from("home_banners")
            .select("id, title, image_url, storage_path, is_active, sort_order, created_at")
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false });

        if (error) throw error;

        loadedHomeBanners = data || [];

        if (count) {
            count.textContent = `${loadedHomeBanners.length} banner(s)`;
        }

        renderHomeBannersList();

        message.textContent = loadedHomeBanners.length
            ? "Manage your uploaded banners below."
            : "No banners uploaded yet.";

    } catch (error) {
        console.error("Could not load Home banners:", error);
        message.textContent =
            "Could not load banners. Check your Supabase policies and connection.";
    } finally {
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.textContent = "Refresh";
        }
    }
}

function renderHomeBannersList() {
    const list = document.getElementById("homeBannersList");
    if (!list) return;

    if (!loadedHomeBanners.length) {
        list.innerHTML = "<p>Your uploaded banners will appear here.</p>";
        return;
    }

    list.innerHTML = loadedHomeBanners.map(function (banner) {
        const id = escapeUserText(banner.id);
        const title = escapeUserText(banner.title || "Untitled banner");
        const imageURL = /^https?:\/\/[^\s"'<>]+$/i.test(banner.image_url || "")
            ? escapeUserText(banner.image_url)
            : "";
        const active = banner.is_active === true;
        const order = Number.isInteger(Number(banner.sort_order))
            ? Number(banner.sort_order)
            : 0;

        return `
            <article style="border:1px solid #e8e8e8;border-radius:14px;padding:14px;margin-top:14px;">
                ${imageURL ? `
                    <img
                        src="${imageURL}"
                        alt="${title}"
                        loading="lazy"
                        style="display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;background:#eee;"
                    >
                ` : `
                    <p>Image URL unavailable.</p>
                `}

                <h4 style="margin:12px 0 6px;">${title}</h4>

                <p style="margin:6px 0;color:#666;">
                    Status: <strong>${active ? "Active" : "Inactive"}</strong>
                </p>

                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px;">
                    <label>
                        Order
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value="${order}"
                            data-banner-order="${id}"
                            style="width:76px;padding:8px;border:1px solid #ddd;border-radius:8px;"
                        >
                    </label>

                    <button
                        type="button"
                        data-save-banner-order="${id}"
                        style="padding:9px 12px;border:1px solid #ddd;border-radius:8px;background:white;cursor:pointer;"
                    >Save Order</button>

                    <button
                        type="button"
                        data-toggle-banner="${id}"
                        style="padding:9px 12px;border:0;border-radius:8px;background:#08c9c5;color:white;cursor:pointer;"
                    >${active ? "Deactivate" : "Activate"}</button>

                    <button
                        type="button"
                        data-delete-banner="${id}"
                        style="padding:9px 12px;border:0;border-radius:8px;background:#ffe9e9;color:#a32020;cursor:pointer;"
                    >Delete</button>
                </div>
            </article>
        `;
    }).join("");
}

async function uploadHomeBanner(event) {
    event.preventDefault();

    const fileInput = document.getElementById("bannerImage");
    const titleInput = document.getElementById("bannerTitle");
    const orderInput = document.getElementById("bannerOrder");
    const activeInput = document.getElementById("bannerActive");
    const button = document.getElementById("uploadBannerButton");
    const message = document.getElementById("bannerFormMessage");

    const file = fileInput.files[0];

    if (!file) {
        message.textContent = "Please choose a picture.";
        return;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    ];

    if (!allowedTypes.includes(file.type)) {
        message.textContent = "Choose a JPG, PNG, WEBP, or GIF image.";
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        message.textContent = "The image must be 5 MB or smaller.";
        return;
    }

    const order = Number(orderInput.value);

    if (!Number.isSafeInteger(order) || order < 0) {
        message.textContent = "Enter a valid display order.";
        return;
    }

    button.disabled = true;
    button.textContent = "Uploading...";
    message.textContent = "Uploading your picture...";

    let uploadedPath = null;

    try {
        const extensionByType = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif"
        };

        const extension = extensionByType[file.type];
        const path = `${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await larckSupabase
            .storage
            .from("larck-banners")
            .upload(path, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type
            });

        if (uploadError) throw uploadError;

        uploadedPath = path;

        const { data: publicURLData } = larckSupabase
            .storage
            .from("larck-banners")
            .getPublicUrl(path);

        const { error: insertError } = await larckSupabase
            .from("home_banners")
            .insert({
                title: titleInput.value.trim() || null,
                image_url: publicURLData.publicUrl,
                storage_path: path,
                is_active: activeInput.checked,
                sort_order: order
            });

        if (insertError) throw insertError;

        document.getElementById("homeBannerForm").reset();
        orderInput.value = "0";
        activeInput.checked = true;

        message.textContent = "Banner uploaded successfully!";
        await loadHomeBanners();

    } catch (error) {
        console.error("Home banner upload failed:", error);

        if (uploadedPath) {
            const { error: cleanupError } = await larckSupabase
                .storage
                .from("larck-banners")
                .remove([uploadedPath]);

            if (cleanupError) {
                console.error("Could not clean up uploaded image:", cleanupError);
            }
        }

        message.textContent =
            error.message || "Upload failed. Please try again.";
    } finally {
        button.disabled = false;
        button.textContent = "Upload Banner";
    }
}

async function toggleHomeBanner(id) {
    const banner = loadedHomeBanners.find(item => item.id === id);
    if (!banner) return;

    const { error } = await larckSupabase
        .from("home_banners")
        .update({ is_active: !banner.is_active })
        .eq("id", id);

    if (error) {
        console.error("Could not change banner status:", error);
        alert("Could not change banner status. Please try again.");
        return;
    }

    await loadHomeBanners();
}

async function saveHomeBannerOrder(id) {
    const input = document.querySelector(
        `[data-banner-order="${CSS.escape(id)}"]`
    );

    if (!input) return;

    const order = Number(input.value);

    if (!Number.isSafeInteger(order) || order < 0) {
        alert("Enter a valid order number.");
        return;
    }

    const { error } = await larckSupabase
        .from("home_banners")
        .update({ sort_order: order })
        .eq("id", id);

    if (error) {
        console.error("Could not save banner order:", error);
        alert("Could not save the banner order.");
        return;
    }

    await loadHomeBanners();
}

async function deleteHomeBanner(id) {
    const banner = loadedHomeBanners.find(item => item.id === id);
    if (!banner) return;

    if (!window.confirm(
        "Delete this banner permanently? This action cannot be undone."
    )) return;

    try {
        if (banner.storage_path) {
            const { error: storageError } = await larckSupabase
                .storage
                .from("larck-banners")
                .remove([banner.storage_path]);

            if (storageError) throw storageError;
        }

        const { error } = await larckSupabase
            .from("home_banners")
            .delete()
            .eq("id", id);

        if (error) throw error;

        await loadHomeBanners();

    } catch (error) {
        console.error("Could not delete banner:", error);
        alert(
            error.message ||
            "Could not delete the banner. Please check your permissions."
        );
    }
}

document.addEventListener("click", function (event) {
    const toggleButton = event.target.closest("[data-toggle-banner]");
    if (toggleButton) {
        toggleHomeBanner(toggleButton.dataset.toggleBanner);
        return;
    }

    const orderButton = event.target.closest("[data-save-banner-order]");
    if (orderButton) {
        saveHomeBannerOrder(orderButton.dataset.saveBannerOrder);
        return;
    }

    const deleteButton = event.target.closest("[data-delete-banner]");
    if (deleteButton) {
        deleteHomeBanner(deleteButton.dataset.deleteBanner);
    }
});



async function renderCoinReserveSection() {
    sectionContent.innerHTML = `
        <div class="section-heading">
            <div>
                <h3>LARCK Coin Reserve</h3>
                <p>Initial platform supply: 500 billion coins.</p>
            </div>
        </div>

        <section class="activity-panel" style="padding:20px;">
            <h3>Initialize Coin Reserve</h3>
            <p>
                This one-time operation initializes the reserve
                and records the initial supply in the transaction ledger.
            </p>
            <p><strong>Initial supply:</strong> 500,000,000,000 coins</p>

            <button
                type="button"
                id="initializeCoinReserveButton"
                style="padding:12px 18px;border:0;border-radius:10px;
                background:#08c9c5;color:white;font-weight:600;cursor:pointer;"
            >Initialize 500 Billion Coins</button>

            <p id="coinReserveMessage" role="status"
               style="overflow-wrap:anywhere;"></p>
        </section>
    `;

    const button = document.getElementById(
        "initializeCoinReserveButton"
    );
    const message = document.getElementById("coinReserveMessage");

    button.addEventListener("click", async function () {
        const confirmed = window.confirm(
            "Initialize the LARCK reserve with 500 billion coins? " +
            "This operation can only succeed once."
        );

        if (!confirmed) return;

        button.disabled = true;
        button.textContent = "Initializing...";
        message.textContent = "Checking authorization and initializing...";

        try {
            const { data, error } = await larckSupabase.rpc(
                "initialize_larck_coin_reserve"
            );

            if (error) throw error;

            message.textContent = data ||
                "Initialization completed. Verify the reserve in Supabase.";
            button.textContent = "Initialization Completed";

        } catch (error) {
            console.error("Coin reserve initialization failed:", error);
            message.textContent =
                "Initialization failed: " + error.message;
            button.disabled = false;
            button.textContent = "Initialize 500 Billion Coins";
        }
    });
}




function escapeCoinText(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

let coinPaymentType = "customer";
let coinPaymentStatus = "pending";



let coinCreditSelectedProfile = null;

async function findCoinCreditUser() {
    const idInput = document.getElementById("testCreditLarckId");
    const findButton = document.getElementById("findCreditUserButton");
    const details = document.getElementById("creditUserDetails");
    const message = document.getElementById("testCreditMessage");

    if (!idInput || !findButton || !details || !message) return;

    const larckId = idInput.value.trim();

    details.style.display = "none";
    coinCreditSelectedProfile = null;

    if (!/^[0-9]{7}$/.test(larckId)) {
        message.textContent = "Enter a valid 7-digit LARCK ID.";
        return;
    }

    findButton.disabled = true;
    findButton.textContent = "Searching...";
    message.textContent = "Finding user...";

    try {
        const { data, error } = await larckSupabase
            .from("profiles")
            .select("id, username, larck_id, country")
            .eq("larck_id", larckId)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            message.textContent = "No user found with this LARCK ID.";
            return;
        }

        coinCreditSelectedProfile = data;

        document.getElementById("creditUserName").textContent =
            data.username || "LARCK User";

        document.getElementById("creditUserId").textContent =
            "LARCK ID: " + data.larck_id;

        document.getElementById("creditUserCountry").textContent =
            "Country: " + (data.country || "Not provided");

        details.style.display = "block";
        message.textContent = "User found. Confirm the details before crediting.";

    } catch (error) {
        console.error("Could not find coin credit user:", error);
        message.textContent = error.message || "Could not find this user.";
    } finally {
        findButton.disabled = false;
        findButton.textContent = "Find User";
    }
}


async function creditUserTestCoins() {
    const amountInput = document.getElementById("testCreditAmount");
    const button = document.getElementById("creditUserCoinsButton");
    const message = document.getElementById("testCreditMessage");

    if (!coinCreditSelectedProfile || !amountInput || !button || !message) {
        message.textContent = "Find a user first.";
        return;
    }

    const amount = Number(amountInput.value);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
        message.textContent = "Enter a valid positive whole-number coin amount.";
        return;
    }

    const profile = coinCreditSelectedProfile;

    const confirmed = window.confirm(
        `Credit ${amount.toLocaleString()} coins to ${profile.username || "this user"}? ` +
        `LARCK ID: ${profile.larck_id}. The amount will be deducted from the coin reserve.`
    );

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = "Crediting...";
    message.textContent = "Processing coin credit...";

    try {
        const { data, error } = await larckSupabase.rpc(
            "credit_larck_test_coins",
            {
                p_larck_id: profile.larck_id,
                p_amount: amount,
                p_idempotency_key: "admin-test-credit:" + crypto.randomUUID()
            }
        );

        if (error) throw error;

        message.textContent =
            data || `${amount.toLocaleString()} coins credited successfully.`;

        amountInput.value = "";

        await loadCoinReserveAndHistory();

    } catch (error) {
        console.error("Admin coin credit failed:", error);
        message.textContent =
            "Coin credit failed: " + (error.message || "Please try again.");
    } finally {
        button.disabled = false;
        button.textContent = "Credit Coins";
    }
}


function renderCoinControlSection() {
    sectionContent.innerHTML = `
        <div class="section-heading">
            <div>
                <h3>LARCK Coin Control</h3>
                <p>Review payments before releasing coins.</p>
            </div>
            <button type="button" id="refreshCoinPayments">
                Refresh
            </button>
        </div>

       <section class="activity-panel coin-credit-panel">
    <h3 style="margin-top:0;">Credit User Coins</h3>
    <p>Find a LARCK user using their 7-digit LARCK ID, then credit their wallet.</p>

    <label for="testCreditLarckId">User LARCK ID</label>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 16px;">
        <input
            id="testCreditLarckId"
            type="text"
            inputmode="numeric"
            maxlength="7"
            placeholder="Enter 7-digit LARCK ID"
            style="flex:1;min-width:180px;padding:12px;border:1px solid #ddd;border-radius:10px;"
        >
        <button
            type="button"
            id="findCreditUserButton"
            style="padding:12px 18px;border:0;border-radius:10px;background:#08c9c5;color:white;cursor:pointer;"
        >Find User</button>
    </div>

<div id="creditUserDetails" class="coin-credit-user">       
       <strong id="creditUserName"></strong>
        <p id="creditUserId" style="margin:6px 0;"></p>
        <p id="creditUserCountry" style="margin:6px 0;"></p>

        <label for="testCreditAmount">Coin amount</label>
        <input
            id="testCreditAmount"
            type="number"
            min="1"
            step="1"
            placeholder="Enter coin amount"
            style="display:block;width:100%;box-sizing:border-box;padding:12px;margin:8px 0 12px;border:1px solid #ddd;border-radius:10px;"
        >

        <button
            type="button"
            id="creditUserCoinsButton"
            style="padding:12px 18px;border:0;border-radius:10px;background:#08c9c5;color:white;font-weight:600;cursor:pointer;"
        >Credit Coins</button>
    </div>

    <p id="testCreditMessage" role="status" style="overflow-wrap:anywhere;"></p>
</section>

        <section class="activity-panel" style="padding:18px;">
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
                <button type="button" data-coin-type="customer">
                    Customer Payments
                </button>
                <button type="button" data-coin-type="seller">
                    Seller Payments
                </button>
            </div>

            <label for="coinPaymentStatus">Payment status</label>
            <select id="coinPaymentStatus"
                style="display:block;width:100%;padding:12px;margin:8px 0 16px;border:1px solid #ddd;border-radius:10px;">
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All statuses</option>
            </select>

            <p id="coinPaymentsMessage" role="status">
                Loading payments...
            </p>
            <div id="coinPaymentsList"></div>
        </section>

        <section class="activity-panel"
            style="padding:18px;margin-top:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                <h3 style="margin:0;">Coin Reserve Overview</h3>
                <button type="button" id="refreshCoinOverview">
                    Refresh
                </button>
            </div>

            <p id="coinOverviewMessage" role="status">
                Loading reserve...
            </p>

            <div id="coinOverviewCards"
                style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
            </div>
        </section>

        <section class="activity-panel"
            style="padding:18px;margin-top:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                <h3 style="margin:0;">Coin Transaction History</h3>
                <button type="button" id="refreshCoinHistory">
                    Refresh
                </button>
            </div>

            <p id="coinHistoryMessage" role="status">
                Loading transactions...
            </p>

            <div id="coinHistoryList"
                style="overflow-x:auto;"></div>
        </section>
    `;

    document.getElementById("coinPaymentStatus").value =
        coinPaymentStatus;

    loadCoinPayments();
    loadCoinReserveAndHistory();
}

async function loadCoinPayments() {
    const list = document.getElementById("coinPaymentsList");
    const message = document.getElementById("coinPaymentsMessage");

    if (!list || !message) return;

    list.innerHTML = "";
    message.textContent = "Loading payments...";

    try {
        const functionName = coinPaymentType === "customer"
            ? "get_larck_coin_payment_requests"
            : "get_larck_seller_payment_requests";

        const { data, error } = await larckSupabase.rpc(
            functionName,
            { p_status: coinPaymentStatus }
        );

        if (error) throw error;

        const rows = data || [];

        if (!rows.length) {
            message.textContent = "No payments found for this filter.";
            return;
        }

        message.textContent = `${rows.length} payment(s) found.`;

        list.innerHTML = rows.map(row => {
            const id = escapeCoinText(row.request_id);
            const status = escapeCoinText(
                row.request_status || "unknown"
            );
            const reference = escapeCoinText(
                row.payment_reference || "Not provided"
            );
            const proof = String(row.proof_url || "");
            const safeProof = /^https?:\/\/[^\s"'<>]+$/i.test(proof)
                ? escapeCoinText(proof)
                : "";

            const amount = coinPaymentType === "customer"
                ? Number(row.amount_minor || 0) / 1000000
                : Number(row.amount_micro_usdt || 0) / 1000000;

            const coins = coinPaymentType === "seller"
                ? Number(row.coin_quantity || 0).toLocaleString()
                : null;

            const title = coinPaymentType === "customer"
                ? `Customer: ${row.customer_id || "Unknown"}`
                : `Seller: ${row.seller_user_id || row.seller_id || "Unknown"}`;

            const details = coinPaymentType === "customer"
                ? `Package ID: ${row.package_id || "Unknown"}`
                : `${row.package_name || "Seller package"} · ${coins} coins`;

            const created = row.created_at || row.submitted_at;
            const dateText = created
                ? escapeCoinText(new Date(created).toLocaleString())
                : "Date unavailable";

            const isPending = String(row.request_status).toLowerCase()
                === "pending";

            return `
                <article style="padding:16px 0;border-bottom:1px solid #eee;">
                    <strong>${escapeCoinText(title)}</strong>
                    <p style="margin:6px 0;color:#555;">
                        ${escapeCoinText(details)}
                    </p>
                    <p style="margin:6px 0;">
                        Amount: <strong>${amount.toFixed(6)} USDT</strong>
                    </p>
                    <p style="margin:6px 0;overflow-wrap:anywhere;">
                        Transaction hash: ${reference}
                    </p>
                    <p style="margin:6px 0;color:#666;">
                        Status: ${status} · ${dateText}
                    </p>
                    ${safeProof
                        ? `<p><a href="${safeProof}" target="_blank"
                              rel="noopener noreferrer">Open payment proof</a></p>`
                        : "<p>Payment proof link unavailable.</p>"
                    }
                    ${isPending ? `
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
                            <button type="button"
                                data-coin-approve="${id}"
                                style="background:#08c9c5;color:white;border:0;border-radius:9px;padding:10px 14px;">
                                Approve
                            </button>
                            <button type="button"
                                data-coin-reject="${id}"
                                style="background:#fff;color:#b42318;border:1px solid #b42318;border-radius:9px;padding:10px 14px;">
                                Reject
                            </button>
                        </div>
                    ` : ""}
                </article>
            `;
        }).join("");

   } catch (error) {
    console.error("Could not load coin payments:", error);

    message.textContent =
        "Error: " + (error.message || JSON.stringify(error));

    console.error("Error code:", error.code);
    console.error("Error details:", error.details);
    console.error("Error hint:", error.hint);
}
}



function formatCoinNumber(value) {
    return Number(value ?? 0).toLocaleString("en-US");
}

function formatCoinDate(value) {
    if (!value) return "No transactions yet";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : date.toLocaleString();
}

async function loadCoinReserveAndHistory() {
    await Promise.all([
        loadCoinReserveOverview(),
        loadCoinTransactionHistory()
    ]);
}

async function loadCoinReserveOverview() {
    const message = document.getElementById("coinOverviewMessage");
    const cards = document.getElementById("coinOverviewCards");

    if (!message || !cards) return;

    message.textContent = "Loading reserve overview...";
    cards.innerHTML = "";

    try {
        const { data, error } = await larckSupabase.rpc(
            "get_larck_coin_reserve_overview"
        );

        if (error) throw error;

        const overview = data?.[0];

        if (!overview) {
            message.textContent = "No reserve information found.";
            return;
        }

        const items = [
            ["Initial Supply", overview.initial_supply],
            ["Current Reserve", overview.reserve_balance],
            ["Total Transactions", overview.total_transactions],
            ["Sum of Ledger Entries", overview.total_ledger_coin_quantity]
        ];

        cards.innerHTML = items.map(([label, value]) => `
            <article style="padding:16px;border:1px solid #e8e8e8;border-radius:12px;min-width:0;">
                <p style="margin:0 0 8px;color:#666;">
                    ${escapeCoinText(label)}
                </p>
                <h3 style="margin:0;overflow-wrap:anywhere;">
                    ${escapeCoinText(formatCoinNumber(value))}
                </h3>
            </article>
        `).join("");

        message.textContent =
            "Latest transaction: " +
            formatCoinDate(overview.latest_transaction_at);

    } catch (error) {
        console.error("Coin reserve overview error:", error);
        message.textContent =
            "Could not load reserve overview: " + error.message;
    }
}

async function loadCoinTransactionHistory() {
    const message = document.getElementById("coinHistoryMessage");
    const list = document.getElementById("coinHistoryList");

    if (!message || !list) return;

    message.textContent = "Loading transaction history...";
    list.innerHTML = "";

    try {
        const { data, error } = await larckSupabase.rpc(
            "get_larck_coin_transaction_history",
            { p_limit: 100 }
        );

        if (error) throw error;

        const rows = data || [];

        if (!rows.length) {
            message.textContent = "No coin transactions recorded yet.";
            return;
        }

        message.textContent =
            `${rows.length} transaction(s) loaded.`;

        list.innerHTML = `
            <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:13px;">
                <thead>
                    <tr style="text-align:left;border-bottom:1px solid #ddd;">
                        <th style="padding:10px;">Type</th>
                        <th style="padding:10px;">Coins</th>
                        <th style="padding:10px;">From User</th>
                        <th style="padding:10px;">To User</th>
                        <th style="padding:10px;">Description</th>
                        <th style="padding:10px;">Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(row => `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:10px;white-space:nowrap;">
                                ${escapeCoinText(row.transaction_type)}
                            </td>
                            <td style="padding:10px;white-space:nowrap;">
                                ${escapeCoinText(formatCoinNumber(row.coin_quantity))}
                            </td>
                            <td style="padding:10px;overflow-wrap:anywhere;">
                                ${escapeCoinText(row.from_user_id || "—")}
                            </td>
                            <td style="padding:10px;overflow-wrap:anywhere;">
                                ${escapeCoinText(row.to_user_id || "—")}
                            </td>
                            <td style="padding:10px;min-width:140px;">
                                ${escapeCoinText(row.description || "—")}
                            </td>
                            <td style="padding:10px;white-space:nowrap;">
                                ${escapeCoinText(formatCoinDate(row.created_at))}
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;

    } catch (error) {
        console.error("Coin transaction history error:", error);
        message.textContent =
            "Could not load transaction history: " + error.message;
    }
}



async function reviewCoinPayment(requestId, action) {
    if (!requestId) return;

    const isCustomer = coinPaymentType === "customer";
    const actionText = action === "approve" ? "approve" : "reject";

    if (!confirm(`Are you sure you want to ${actionText} this payment?`)) {
        return;
    }

    const buttons = sectionContent.querySelectorAll(
        `[data-coin-${action}="${CSS.escape(requestId)}"]`
    );
    buttons.forEach(button => button.disabled = true);

    try {
        let functionName;
        let args;

        if (isCustomer && action === "approve") {
            functionName = "approve_larck_coin_payment";
            args = {
                p_payment_request_id: requestId,
                p_idempotency_key: `customer-payment-approved:${requestId}`
            };
        } else if (isCustomer) {
            functionName = "reject_larck_coin_payment";
            args = { p_payment_request_id: requestId };
        } else if (action === "approve") {
            functionName = "approve_larck_seller_payment";
            args = { p_payment_request_id: requestId };
        } else {
            functionName = "reject_larck_seller_payment";
            args = { p_payment_request_id: requestId };
        }

        const { error } = await larckSupabase.rpc(functionName, args);

        if (error) throw error;

        alert(`Payment ${action} action completed.`);
        await loadCoinPayments();

    } catch (error) {
        console.error("Coin payment review failed:", error);
        alert(
            error.message ||
            "The action failed. Refresh and check the payment status."
        );
        await loadCoinPayments();
    }
}

document.addEventListener("click", event => {
    const typeButton = event.target.closest("[data-coin-type]");
    if (typeButton) {
        coinPaymentType = typeButton.dataset.coinType;
        renderCoinControlSection();
        return;
    }

    const approveButton = event.target.closest("[data-coin-approve]");
    if (approveButton) {
        reviewCoinPayment(approveButton.dataset.coinApprove, "approve");
        return;
    }

        if (event.target.closest("#findCreditUserButton")) {
        findCoinCreditUser();
        return;
    }

    if (event.target.closest("#creditUserCoinsButton")) {
        creditUserTestCoins();
        return;
    }

    const rejectButton = event.target.closest("[data-coin-reject]");
    if (rejectButton) {
        reviewCoinPayment(rejectButton.dataset.coinReject, "reject");
        return;
    }

    if (event.target.closest("#refreshCoinPayments")) {
        loadCoinPayments();
    }

    
    if (event.target.closest("#refreshCoinOverview")) {
        loadCoinReserveOverview();
        return;
    }

    if (event.target.closest("#refreshCoinHistory")) {
        loadCoinTransactionHistory();
        return;
    }

});

document.addEventListener("change", event => {
    if (event.target.id === "coinPaymentStatus") {
        coinPaymentStatus = event.target.value;
        loadCoinPayments();
    }
});





function showSection(sectionName) {
    const section = sectionDetails[sectionName];

    if (!section) {
        return;
    }

    pageTitle.textContent = section.title;

    document.querySelectorAll("[data-section]").forEach(function (button) {
        button.classList.toggle(
            "active",
            button.dataset.section === sectionName &&
            button.classList.contains("nav-item")
        );
    });

    if (sectionName === "overview") {
        sectionContent.innerHTML = `
            <div class="section-heading">
                <div>
                    <h3>Platform Overview</h3>
                    <p>Your administration workspace at a glance.</p>
                </div>
            </div>

            
<div class="stat-grid">
    <article class="stat-card">
        <div class="stat-icon teal">♙</div>
        <p>Total Users</p>
        <h3 id="totalUsersStat">Loading...</h3>
        <span>Registered LARCK profiles.</span>
    </article>

    <article class="stat-card">
        <div class="stat-icon purple">▤</div>
        <p>Announcements</p>
        <h3 id="announcementsStat">Loading...</h3>
        <span>Official LARCK Team updates.</span>
    </article>

    <article class="stat-card">
        <div class="stat-icon orange">⚑</div>
        <p>Pending Reports</p>
        <h3>—</h3>
        <span>Connect reports data in a later step.</span>
    </article>

    <article class="stat-card">
        <div class="stat-icon blue">◈</div>
        <p>Platform Status</p>
        <h3>Ready</h3>
        <span>Dashboard foundation.</span>
    </article>
</div>
            <section class="activity-panel">
                <div class="panel-heading">
                    <div>
                        <h3>Quick Access</h3>
                        <p>Choose an area to work on.</p>
                    </div>
                </div>
                <div class="quick-grid">
                    <button data-section="users" class="quick-card">
                        <span>♙</span>
                        <strong>Manage Users</strong>
                        <small>Profiles and account administration</small>
                    </button>
                    <button data-section="announcements" class="quick-card">
                        <span>▤</span>
                        <strong>Announcements</strong>
                        <small>Official LARCK updates</small>
                    </button>
                    <button data-section="moderation" class="quick-card">
                        <span>⚑</span>
                        <strong>Moderation</strong>
                        <small>Platform safety tools</small>
                    </button>
                </div>
            </section>
        `;

                loadOverviewStats();

  } else if (sectionName === "users") {
    renderUsersSection();
} else if (sectionName === "coinControl") {
    renderCoinControlSection();
} else if (sectionName === "bd-space") {
    renderBDSpace();
    
} else if (sectionName === "coin-reserve") {
    renderCoinReserveSection();
   } else if (sectionName === "reports") {
    renderReportsSection();
} else if (sectionName === "banners") {
    renderBannersSection();
} else {
        sectionContent.innerHTML = `
            <div class="section-heading">
                <div>
                    <h3>${section.heading}</h3>
                    <p>${section.description}</p>
                </div>
            </div>
            <section class="placeholder-panel">
                <h3>${section.title}</h3>
                <p>
                    This area is ready for development. Its connection to
                    Supabase and its administrative actions will be added
                    in the next stages.
                </p>
            </section>
        `;
    }

    sidebar.classList.remove("open");
}

document.addEventListener("click", function (event) {
    const sectionButton = event.target.closest("[data-section]");

    if (sectionButton) {
        showSection(sectionButton.dataset.section);
    }
});



document.addEventListener("input", function (event) {
    if (event.target.id === "userSearchInput") {
        userSearchTerm = event.target.value;
        renderFilteredUsers();
    }
});



document.addEventListener("click", function (event) {


    if (event.target.closest("#refreshAgenciesButton")) {
        loadBDAgencies();
        return;
    }

    if (event.target.closest("#copyAgencyIdButton")) {
        const agencyId = document.getElementById(
            "createdAgencyIdValue"
        )?.textContent?.trim();

        if (agencyId) {
            navigator.clipboard.writeText(agencyId)
                .then(() => alert("Agency ID copied."))
                .catch(() => alert(
                    "Could not copy the ID. Please copy it manually."
                ));
        }
    }
});

// ======================================
// MOBILE SIDEBAR
// ======================================

menuButton.addEventListener("click", function () {
    sidebar.classList.toggle("open");
});

// ======================================
// SIGN OUT
// ======================================

logoutButton.addEventListener("click", async function () {
    logoutButton.disabled = true;

    try {
        const { error } = await larckSupabase.auth.signOut();

        if (error) {
            throw error;
        }

        showLogin("You have signed out.");
    } catch (error) {
        console.error("Sign-out error:", error);
        alert("Could not sign out. Please try again.");
    } finally {
        logoutButton.disabled = false;
    }
});

// ======================================
// RESTORE AN EXISTING ADMIN SESSION
// ======================================

async function restoreAdminSession() {
    try {
        const { data, error } = await larckSupabase.auth.getSession();

        if (error) {
            throw error;
        }

        const user = data.session?.user;

        if (!user) {
            showLogin();
            return;
        }

        const isAdmin = await verifyAdmin(user);

        if (!isAdmin) {
            await larckSupabase.auth.signOut();
            showLogin("This account is not authorized to access LARCK Control.");
            return;
        }

        showDashboard(user);

    } catch (error) {
        console.error("Session check failed:", error);
        showLogin(
            "Unable to verify your admin session. Please sign in again."
        );
    }
}

restoreAdminSession();