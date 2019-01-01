//
// Class for generating SVG line charts used on the overview page
//

export interface ICharting {
    CreateLineChartSVG(data: number[][]): string;
}

export class Charting implements ICharting {
    public CreateLineChartSVG(data: number[][]) {
        const prologue = `<svg style="height: 400px; width: 800px;" viewbox="0 0 800 450">`;
        const axisLines = this.generateAxisLines();
        const xAxisLabels = this.generateXaxisLables();
        const yAxisLabels = this.generateYaxisLables();
        const dataPointsWithLine = this.generateSequencePoints();
        const eiplogue = `</svg>`;

        return `${prologue}${axisLines}${xAxisLabels}${yAxisLabels}${dataPointsWithLine}${eiplogue}`;
    }

    private generateAxisLines(){
        return  `
        <g class="grid x-grid" id="xGrid" style="stroke-width: 1px; stroke: #ccc; stroke-dasharray: 0;">
            <line x1="90" x2="90" y1="5" y2="371"></line>
        </g>
        <g class="grid y-grid" id="yGrid" style="stroke-width: 1px; stroke: #ccc; stroke-dasharray: 0;">
            <line x1="90" x2="705" y1="370" y2="370"></line>
        </g>
        `;
    }

    private generateXaxisLables(){
        return `
        <g class="labels x-labels" style="text-anchor: middle; font-size: .875em;">
            <text x="100" y="400">3:00pm</text>
            <text x="246" y="400">3:30pm</text>
            <text x="392" y="400">4:00pm</text>
            <text x="538" y="400">4:30pm</text>
            <text x="684" y="400">5:00pm</text>
            <text x="400" y="440" class="label-title" style="font-weight: bold;">Time</text>
        </g>
        `;
    }

    private generateYaxisLables(){
        return `
        <g class="labels y-labels" style="text-anchor: end; font-size: .875em;">
            <text x="80" y="15">15</text>
            <text x="80" y="131">10</text>
            <text x="80" y="248">5</text>
            <text x="80" y="373">0</text>
            <text x="50" y="200" class="label-title" style="font-weight: bold;">Count</text>
        </g>
        `;
    }

    private generateSequencePoints(){
        return `
        <g class="data">
            <circle cx="90" cy="192" data-value="7.2" r="3" fill="#090"></circle>
            <circle cx="240" cy="141" data-value="8.1" r="3" fill="#090"></circle>
            <circle cx="388" cy="179" data-value="7.7" r="3" fill="#090"></circle>
            <circle cx="531" cy="370" data-value="6.8" r="3" fill="#090"></circle>
            <circle cx="677" cy="104" data-value="6.7" r="3" fill="#090"></circle>
            <polyline points="90,192 240,141 388,179 531,370 677,104" fill="none" stroke="#090" stroke-width="1px" />
        </g>
        `;
    }
}