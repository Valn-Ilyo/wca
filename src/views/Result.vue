<template>
    <div>
        <!-- Downloadable Content -->
        <v-container id="capture" fluid>
            <!-- Title -->
            <v-row justify="center">
                <v-col cols="12" class="text-center">
                    <img src="/wca/wca.svg" alt="WhatsApp Icon" height="48" />
                    <h1 class="text-h5 text-primary font-weight-bold text-center">
                        WHATSAPP CHAT ANALYZER
                    </h1>
                </v-col>
            </v-row>

            <!-- Sections -->
            <v-row justify="center" align="stretch">
                <!-- Section 1: Total Messages -->
                <v-col cols="12" md="4">
                    <v-card flat class="pa-4 text-center">
                        <div class="mb-4 text-subtitle-1">
                            Total messages: <strong>{{ totalMessages.toLocaleString() }}</strong>
                        </div>
                        <Pie :data="pieChartData" :options="pieChartOptions" />
                    </v-card>
                </v-col>

                <!-- Divider 1 -->
                <v-divider :vertical="$vuetify.display.mdAndUp" class="my-4" />

                <!-- Section 2: Chat Timeline -->
                <v-col cols="12" md="4">
                    <v-card flat class="pa-4 text-center">
                        <div class="text-subtitle-1 font-weight-bold mb-3">
                            Chat Timeline
                        </div>

                        <v-progress-linear :model-value="activeDaysPercentage" color="primary" bg-color="secondary"
                            bg-opacity="1" height="24" class="mb-4 text-accent" striped>
                            <template v-slot:default="{ value }">
                                Active on {{ activeDays }} of {{ totalDays }} days ({{ Math.round(value) }}%)
                            </template>
                        </v-progress-linear>

                        <div class="text-body-2 mb-4">
                            That’s about <strong>{{ normalizedActiveDuration }}</strong> of chatting over
                            <strong>{{ normalizedTotalDuration }}</strong>.
                        </div>

                        <div class="text-body-2 text-left">
                            <p>Avg messages/day: <strong>{{ data.averageMessagesPerDay }}</strong></p>
                            <p>Avg response time: <strong>{{ data.averageResponseTime }}</strong></p>
                            <p>First message: <strong>{{ formattedStartDate }}</strong></p>
                            <p>Last message: <strong>{{ formattedEndDate }}</strong></p>
                        </div>
                    </v-card>
                </v-col>

                <!-- Divider 2 -->
                <v-divider :vertical="$vuetify.display.mdAndUp" class="my-4" />

                <!-- Section 3: Activity Chart -->
                <v-col cols="12" md="4">
                    <v-card flat class="pa-4 text-center">
                        <div class="text-subtitle-1 font-weight-bold mb-3">
                            Activity by Time of Day
                        </div>
                        <Bar :data="activityChartData" :options="activityChartOptions" />
                    </v-card>
                </v-col>
            </v-row>
        </v-container>

        <!-- Download Button -->
        <v-row justify="center">
            <v-col cols="auto">
                <v-btn color="primary" @click="downloadImage">
                    Download Report
                </v-btn>
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
/* ─────────────────────────────────────────────
 * Imports
 * ───────────────────────────────────────────── */
import { ref, computed } from 'vue';
import { Pie, Bar } from 'vue-chartjs';
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import html2canvas from 'html2canvas';

/* ─────────────────────────────────────────────
 * Chart.js Registration
 * ───────────────────────────────────────────── */
ChartJS.register(
    Title,
    Tooltip,
    Legend,
    ArcElement,
    ChartDataLabels,
    CategoryScale,
    LinearScale,
    BarElement
);

/* ─────────────────────────────────────────────
 * Data Setup
 * ───────────────────────────────────────────── */
const data = JSON.parse(sessionStorage.getItem("chatData"));
const participants = Object.keys(data.participants);
const messageCounts = Object.values(data.participants);
const totalMessages = computed(() => messageCounts.reduce((a, b) => a + b, 0));

/* ─────────────────────────────────────────────
 * Date & Duration Formatting
 * ───────────────────────────────────────────── */
const formattedStartDate = new Date(data.startDate).toDateString();
const formattedEndDate = new Date(data.endDate).toDateString();
const totalDays = data.totalDays;
const activeDays = data.activeDays;
const activeDaysPercentage = (activeDays / totalDays) * 100;

function normalizeDays(days) {
    const y = Math.floor(days / 365);
    const m = Math.floor((days % 365) / 30);
    const d = days % 30;

    return [y && `${y} year${y > 1 ? 's' : ''}`, m && `${m} month${m > 1 ? 's' : ''}`, d && `${d} day${d > 1 ? 's' : ''}`]
        .filter(Boolean)
        .join(' ') || '0 days';
}

const normalizedTotalDuration = normalizeDays(totalDays);
const normalizedActiveDuration = normalizeDays(activeDays);

/* ─────────────────────────────────────────────
 * Pie Chart Configuration
 * ───────────────────────────────────────────── */
const pieChartData = {
    labels: participants,
    datasets: [{
        data: messageCounts,
        backgroundColor: [
            '#C8102E',
            '#007A3D',
            ...participants.slice(2).map(() =>
                '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
            )
        ]
    }]
};

const pieChartOptions = {
    responsive: true,
    plugins: {
        legend: { position: 'bottom' },
        tooltip: {
            callbacks: {
                label: (ctx) => {
                    const total = messageCounts.reduce((a, b) => a + b, 0);
                    const percentage = ((ctx.raw / total) * 100).toFixed(2);
                    return `${ctx.label}: ${ctx.raw} (${percentage}%)`;
                }
            }
        },
        datalabels: {
            formatter: (value, ctx) => {
                const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                return ((value / total) * 100).toFixed(1) + '%';
            },
            color: '#fff',
            font: { weight: 'bold' }
        }
    }
};

/* ─────────────────────────────────────────────
 * Bar Chart (Activity Distribution)
 * ───────────────────────────────────────────── */
const activityLabels = Object.keys(data.activityDistribution);
const activityValues = Object.values(data.activityDistribution);

const activityBarColors = activityLabels.map((_, index) =>
    index % 2 === 0 ? '#C8102E' : '#007A3D'
);

const activityChartData = {
    labels: activityLabels,
    datasets: [{
        data: activityValues,
        backgroundColor: activityBarColors,
        barThickness: 32
    }]
};

// Ensure percentages sum to 100 (for datalabels)
function computeRoundedPercentages(dataArr) {
    const total = dataArr.reduce((a, b) => a + b, 0);
    const rawPercentages = dataArr.map(val => (val / total) * 100);
    const floored = rawPercentages.map(Math.floor);
    const floorSum = floored.reduce((a, b) => a + b, 0);
    const remainder = 100 - floorSum;

    const remainders = rawPercentages.map((val, i) => ({
        index: i,
        remainder: val - Math.floor(val)
    })).sort((a, b) => b.remainder - a.remainder);

    for (let i = 0; i < remainder; i++) {
        floored[remainders[i].index]++;
    }

    return floored;
}

const roundedPercentages = computeRoundedPercentages(activityValues);

const activityChartOptions = {
    indexAxis: 'y',
    plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
                label: (ctx) => `${ctx.raw} messages`
            }
        },
        datalabels: {
            color: '#F9F6F1',
            formatter: (value, ctx) => `${roundedPercentages[ctx.dataIndex]}%`,
            anchor: 'end',
            align: 'left',
            clamp: true
        }
    },
    scales: {
        x: { display: false }
    }
};

/* ─────────────────────────────────────────────
 * Screenshot Download
 * ───────────────────────────────────────────── */
const downloadImage = () => {
    html2canvas(document.getElementById("capture")).then(canvas => {
        const link = document.createElement('a');
        link.download = 'screenshot.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
};
</script>
