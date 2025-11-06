// OneStamps Business Dashboard - Main Application

// ============================================
// CONFIGURATION
// ============================================

// TODO: Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://wlnphingifczfdqxaijb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbnBoaW5naWZjemZkcXhhaWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDIyMjUsImV4cCI6MjA3NzU3ODIyNX0.Per-ycPmUs_5EPLsyb9kDaZ5U9fP9x8JJ89ZmsiPmKQ'

// TODO: After deploying edge function, update this URL
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/generate-stamps`

// ============================================
// INITIALIZE SUPABASE CLIENT
// ============================================

const { createClient } = supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================
// STATE MANAGEMENT
// ============================================

let currentUser = null
let selectedBusinessId = null
let generatedStamps = []

// ============================================
// SCREEN NAVIGATION
// ============================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden')
    })
    document.getElementById(screenId).classList.remove('hidden')
}

// ============================================
// AUTHENTICATION
// ============================================

// Login Handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault()

    const email = document.getElementById('loginEmail').value
    const password = document.getElementById('loginPassword').value
    const errorEl = document.getElementById('errorMessage')

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        })

        if (error) throw error

        currentUser = data.user
        document.getElementById('userEmail').textContent = currentUser.email

        await loadDashboard()
        showScreen('dashboardScreen')
    } catch (error) {
        errorEl.textContent = error.message
    }
})

// Signup Handler
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault()

    const email = document.getElementById('signupEmail').value
    const password = document.getElementById('signupPassword').value
    const name = document.getElementById('signupName').value
    const phone = document.getElementById('signupPhone').value
    const username = document.getElementById('signupUsername').value
    const errorEl = document.getElementById('signupError')

    try {
        // Create auth user
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password
        })

        if (authError) throw authError

        // Create user profile
        const { error: profileError } = await supabaseClient
            .from('users')
            .insert({
                id: authData.user.id,
                email,
                username,
                full_name: name,
                phone_number: phone
            })

        if (profileError) throw profileError

        alert('Account created! Please login.')
        showScreen('loginScreen')
    } catch (error) {
        errorEl.textContent = error.message
    }
})

// Show/Hide signup form
document.getElementById('showSignupBtn').addEventListener('click', () => {
    showScreen('signupScreen')
})

document.getElementById('backToLoginBtn').addEventListener('click', () => {
    showScreen('loginScreen')
})

// Logout Handler
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut()
    currentUser = null
    selectedBusinessId = null
    showScreen('loginScreen')
})

// ============================================
// DASHBOARD LOADING
// ============================================

async function loadDashboard() {
    await loadBusinesses()
}

// Load user's businesses
async function loadBusinesses() {
    const select = document.getElementById('businessSelect')

    try {
        const { data, error } = await supabaseClient
            .from('businesses')
            .select('*')
            .eq('owner_user_id', currentUser.id)

        if (error) throw error

        if (data.length === 0) {
            select.innerHTML = '<option value="">No businesses yet - create one below</option>'
            return
        }

        select.innerHTML = '<option value="">Select a business...</option>'
        data.forEach(biz => {
            const option = document.createElement('option')
            option.value = biz.id
            option.textContent = biz.name
            select.appendChild(option)
        })
    } catch (error) {
        console.error('Error loading businesses:', error)
        select.innerHTML = '<option value="">Error loading businesses</option>'
    }
}

// Business selection change
document.getElementById('businessSelect').addEventListener('change', async (e) => {
    selectedBusinessId = e.target.value

    if (selectedBusinessId) {
        document.getElementById('stampGenerator').classList.remove('hidden')
        document.getElementById('allStampsTable').classList.remove('hidden')
        await loadStampStats()
        await loadAllStamps()
    } else {
        document.getElementById('stampGenerator').classList.add('hidden')
        document.getElementById('allStampsTable').classList.add('hidden')
        document.getElementById('stampsDisplay').classList.add('hidden')
    }
})

// ============================================
// BUSINESS CREATION
// ============================================

document.getElementById('createBusinessBtn').addEventListener('click', () => {
    document.getElementById('createBusinessForm').classList.remove('hidden')
})

document.getElementById('cancelBusinessBtn').addEventListener('click', () => {
    document.getElementById('createBusinessForm').classList.add('hidden')
})

document.getElementById('newBusinessForm').addEventListener('submit', async (e) => {
    e.preventDefault()

    const businessData = {
        owner_user_id: currentUser.id,
        name: document.getElementById('bizName').value,
        category: document.getElementById('bizCategory').value,
        description: document.getElementById('bizDescription').value,
        address: document.getElementById('bizAddress').value,
        latitude: parseFloat(document.getElementById('bizLat').value),
        longitude: parseFloat(document.getElementById('bizLng').value),
        stamps_required: parseInt(document.getElementById('bizStamps').value),
        reward_description: document.getElementById('bizReward').value,
        rating: 5.0
    }

    try {
        const { data, error } = await supabaseClient
            .from('businesses')
            .insert(businessData)
            .select()

        if (error) throw error

        alert('Business created successfully!')
        document.getElementById('createBusinessForm').classList.add('hidden')
        document.getElementById('newBusinessForm').reset()
        await loadBusinesses()
    } catch (error) {
        alert('Error creating business: ' + error.message)
    }
})

// ============================================
// STAMP STATISTICS
// ============================================

async function loadStampStats() {
    try {
        const { data, error } = await supabaseClient
            .from('one_time_stamps')
            .select('status')
            .eq('business_id', selectedBusinessId)

        if (error) throw error

        const stats = {
            active: 0,
            used: 0,
            expired: 0
        }

        data.forEach(stamp => {
            if (stats.hasOwnProperty(stamp.status)) {
                stats[stamp.status]++
            }
        })

        document.getElementById('activeStamps').textContent = stats.active
        document.getElementById('usedStamps').textContent = stats.used
        document.getElementById('expiredStamps').textContent = stats.expired
    } catch (error) {
        console.error('Error loading stats:', error)
    }
}

// ============================================
// STAMP GENERATION
// ============================================

document.getElementById('generateForm').addEventListener('submit', async (e) => {
    e.preventDefault()

    if (!selectedBusinessId) {
        alert('Please select a business first')
        return
    }

    const quantity = parseInt(document.getElementById('quantity').value)
    const expiryDays = parseInt(document.getElementById('expiryDays').value)
    const statusEl = document.getElementById('generationStatus')
    const submitBtn = e.target.querySelector('button[type="submit"]')

    // Show loading state
    submitBtn.disabled = true
    submitBtn.innerHTML = '<span class="spinner"></span> Generating...'
    statusEl.className = 'status-message loading'
    statusEl.textContent = `Generating ${quantity} stamps...`

    try {
        // Get current session
        const { data: { session } } = await supabaseClient.auth.getSession()

        // Call edge function
        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                businessId: selectedBusinessId,
                quantity,
                expiryDays
            })
        })

        const result = await response.json()

        if (!response.ok) {
            throw new Error(result.error || 'Failed to generate stamps')
        }

        // Success!
        generatedStamps = result.stamps
        statusEl.className = 'status-message success'
        statusEl.textContent = `✅ Successfully generated ${quantity} stamps! Scroll down to view.`

        // Display the stamps
        displayGeneratedStamps(generatedStamps)

        // Refresh stats and table
        await loadStampStats()
        await loadAllStamps()

        // Reset form
        document.getElementById('generateForm').reset()
    } catch (error) {
        statusEl.className = 'status-message error-message'
        statusEl.textContent = `❌ Error: ${error.message}`
    } finally {
        submitBtn.disabled = false
        submitBtn.innerHTML = '🎫 Generate Stamps'
    }
})

// ============================================
// DISPLAY GENERATED STAMPS
// ============================================

function displayGeneratedStamps(stamps) {
    const container = document.getElementById('stampsList')
    const displayCard = document.getElementById('stampsDisplay')

    container.innerHTML = ''
    displayCard.classList.remove('hidden')

    stamps.forEach(stamp => {
        const stampEl = document.createElement('div')
        stampEl.className = 'stamp-item'

        // Generate QR code
        const canvas = document.createElement('canvas')
        QRCode.toCanvas(canvas, stamp.stamp_code, {
            width: 200,
            margin: 1
        })

        const codeText = document.createElement('div')
        codeText.className = 'stamp-code'
        codeText.textContent = stamp.stamp_code

        const downloadBtn = document.createElement('button')
        downloadBtn.className = 'btn btn-primary'
        downloadBtn.textContent = 'Download QR'
        downloadBtn.onclick = () => downloadQR(canvas, stamp.stamp_code)

        stampEl.appendChild(canvas)
        stampEl.appendChild(codeText)
        stampEl.appendChild(downloadBtn)
        container.appendChild(stampEl)
    })
}

// Download single QR code
function downloadQR(canvas, stampCode) {
    const link = document.createElement('a')
    link.download = `${stampCode}.png`
    link.href = canvas.toDataURL()
    link.click()
}

// Download all QR codes
document.getElementById('downloadAllBtn').addEventListener('click', () => {
    generatedStamps.forEach((stamp, index) => {
        setTimeout(() => {
            const canvas = document.querySelectorAll('.stamp-item canvas')[index]
            downloadQR(canvas, stamp.stamp_code)
        }, index * 100) // Stagger downloads
    })
})

// ============================================
// ALL STAMPS TABLE
// ============================================

async function loadAllStamps() {
    const tbody = document.getElementById('stampsTableBody')
    const filterStatus = document.getElementById('filterStatus').value

    try {
        let query = supabaseClient
            .from('one_time_stamps')
            .select('*, users(email)')
            .eq('business_id', selectedBusinessId)
            .order('created_at', { ascending: false })

        if (filterStatus) {
            query = query.eq('status', filterStatus)
        }

        const { data, error } = await query

        if (error) throw error

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No stamps found</td></tr>'
            return
        }

        tbody.innerHTML = ''
        data.forEach(stamp => {
            const row = document.createElement('tr')
            row.innerHTML = `
                <td><code>${stamp.stamp_code.substring(0, 20)}...</code></td>
                <td><span class="status-badge ${stamp.status}">${stamp.status}</span></td>
                <td>${new Date(stamp.created_at).toLocaleDateString()}</td>
                <td>${new Date(stamp.expires_at).toLocaleDateString()}</td>
                <td>${stamp.users?.email || '-'}</td>
                <td>${stamp.used_at ? new Date(stamp.used_at).toLocaleString() : '-'}</td>
            `
            tbody.appendChild(row)
        })
    } catch (error) {
        console.error('Error loading stamps:', error)
        tbody.innerHTML = '<tr><td colspan="6">Error loading stamps</td></tr>'
    }
}

// Refresh stamps button
document.getElementById('refreshStampsBtn').addEventListener('click', loadAllStamps)

// Filter status change
document.getElementById('filterStatus').addEventListener('change', loadAllStamps)

// ============================================
// INITIALIZE APP
// ============================================

async function initApp() {
    // Check if user is already logged in
    const { data: { session } } = await supabaseClient.auth.getSession()

    if (session) {
        currentUser = session.user
        document.getElementById('userEmail').textContent = currentUser.email
        await loadDashboard()
        showScreen('dashboardScreen')
    } else {
        showScreen('loginScreen')
    }
}

// Start the app
initApp()
