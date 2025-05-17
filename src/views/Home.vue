<template>
    <v-container class="fill-height text-center justify-center flex-column pa-0">
        <v-sheet>
            <v-form v-model="valid" @submit.prevent="processFile">

                <v-row justify="center">
                    <v-col cols="12" class="text-center">
                        <img src="/icon.svg" alt="WhatsApp Icon" height="48" />
                        <h1 class="text-h5 text-primary font-weight-bold text-center">
                            WHATSAPP CHAT ANALYZER
                        </h1>
                    </v-col>
                </v-row>

                <v-card-text>
                    <v-file-input v-model="file" prepend-icon="" prepend-inner-icon="mdi-file-upload" accept=".zip,.txt"
                        :rules="rules" clearable label="WhatsApp Chat [.zip/.txt]" variant="outlined"
                        hide-details="auto" />

                </v-card-text>
                <v-card-actions class="justify-center">
                    <v-btn :loading="analyzing" type="submit" :disabled="!valid" color="secondary" variant="flat"
                        text="analyze" prepend-icon="mdi-file-search" />
                </v-card-actions>

            </v-form>
            <v-alert icon="mdi-alert-circle-outline" variant="text" density="compact" v-if="alert" color="primary"
                closable @click:close="alert = false">
                {{ error }}
            </v-alert>
        </v-sheet>
        <v-btn href="https://www.instagram.com/valn_ilyo" target="_blank" rel="noopener" icon="mdi-instagram" flat />
    </v-container>
</template>

<script setup>
import JSZip from 'jszip'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const valid = ref(false)
const file = ref(null)

const error = ref('')
const alert = ref(false)
const analyzing = ref(false)

const rules = [
    (file) => {
        const name = file?.name?.toLowerCase()
        return name && (name.endsWith('.zip') || name.endsWith('.txt'))
            ? true
            : 'invalid file type'
    }
]

const processFile = async () => {
    analyzing.value = true
    if (file.value.name.toLowerCase().endsWith('.txt')) await handleTextFile(file.value)
    else await handleZipFile(file.value)
}

const handleZipFile = async (file) => {
    try {
        const zip = await JSZip.loadAsync(file)
        const chatFile = Object.values(zip.files).find(f =>
            f.name.toLowerCase().startsWith('whatsapp chat with')
        )
        if (!chatFile) throw new Error('no whatsapp chat found in the zip')
        const chatBlob = await chatFile.async('blob')
        await handleTextFile(chatBlob)
    } catch (err) {
        displayError(err.message)
    }
}


const handleTextFile = async (file) => {
    const reader = new FileReader()
    reader.onload = (event) => analyzeChatContent(event.target.result)
    reader.readAsText(file)
}

const analyzeChatContent = (content) => {
    try {
        const dateTimePattern = detectDateTimePattern(content)
        if (!dateTimePattern) throw new Error('unable to detect chat\'s date-time format')
        const analytics = extractChatAnalytics(content, dateTimePattern)
        sessionStorage.setItem('chatData', JSON.stringify(analytics))
        analyzing.value = false
        router.push('/result')
    } catch (err) {
        displayError(err.message)
    }
}

const detectDateTimePattern = (content) => {
    const patterns = [
        /^((\d{1,2}\/\d{1,2}\/\d{2}),.(\d{1,2}:\d{2}.[AP]M))/,
        /^((\d{1,2}\/\d{1,2}\/\d{2}),.(\d{2}:\d{2}))/,
        /^((\d{1,2}\/\d{1,2}\/\d{2}),.(\d{1,2}:\d{2}.[ap]m))/,
    ]

    const firstLine = content.split('\n')[0]
    for (let i = 0; i < patterns.length; i++) {
        if (patterns[i].test(firstLine)) {
            return { pattern: patterns[i], index: i }
        }
    }
    return null
}


const extractChatAnalytics = (content, dateTimePattern) => {
    const pattern = new RegExp(dateTimePattern.pattern.source + '\\s-\\s(.*?):', 'gm')
    const matches = [...content.matchAll(pattern)]

    const analytics = {
        startDate: new Date(convertDDMMYYtoMMDDYY(matches[0][2], dateTimePattern.index)).toDateString(),
        endDate: new Date(convertDDMMYYtoMMDDYY(matches[matches.length - 1][2], dateTimePattern.index)).toDateString(),
        totalDays: calculateDateDifference(convertDDMMYYtoMMDDYY(matches[0][2], dateTimePattern.index), convertDDMMYYtoMMDDYY(matches[matches.length - 1][2], dateTimePattern.index)),
        activeDays: 0,
        messageCount: matches.length,
        participants: {},
        activityDistribution: { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 }
    }

    processMessages(matches, analytics)
    return analytics
}



const processMessages = (messages, analytics) => {
    let previousDate = '', previousUser = '', previousTimestamp = null
    const responseTimes = []

    messages.forEach(match => {
        const user = match[4]
        const timestamp = new Date(Date.parse(match[2] + ' ' + match[3])).getTime()
        const hour = new Date(timestamp).getHours()
        const dateStr = new Date(timestamp).toDateString()

        if (previousDate !== dateStr) {
            analytics.activeDays++
            previousDate = dateStr
            previousTimestamp = timestamp
        }

        if (previousUser !== user && previousTimestamp) {
            responseTimes.push((timestamp - previousTimestamp) / 1000)
        }

        analytics.participants[user] = (analytics.participants[user] || 0) + 1

        if (hour >= 6 && hour < 12) analytics.activityDistribution.Morning++
        else if (hour >= 12 && hour < 18) analytics.activityDistribution.Afternoon++
        else if (hour >= 18 && hour < 22) analytics.activityDistribution.Evening++
        else analytics.activityDistribution.Night++

        previousUser = user
        previousTimestamp = timestamp
    })

    analytics.participants = Object.fromEntries(
        Object.entries(analytics.participants).sort(([, a], [, b]) => b - a)
    )

    analytics.averageResponseTime = formatTime(
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    )
    analytics.averageMessagesPerDay = Math.round(
        analytics.messageCount / analytics.activeDays
    )
}

const calculateDateDifference = (startDate, endDate) => {
    const diff = Math.abs(Date.parse(endDate) - Date.parse(startDate))
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
}


const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.round(seconds % 60)
    return hours === 0 ? `${minutes}m ${secs}s` : `${hours}h ${minutes}m ${secs}s`
}

const displayError = (msg) => {
    error.value = msg
    alert.value = true
    analyzing.value = false
}

function convertDDMMYYtoMMDDYY(dateStr, index) {
    if (index == 2) {
        const [day, month, year] = dateStr.split('/')
        return `${month}/${day}/${year}`
    }
    return dateStr
}

</script>