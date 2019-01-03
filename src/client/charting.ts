//
// Class for generating SVG line charts used on the overview page
//

export interface IChart {
    Render(data: number[]): string;
}

export class LineChart implements IChart {
    public Render(data: number[]) {
        const prologue = `<svg style="height: auto; width: 100%;" viewbox="0,0 500,300">`;
        const axisLines = this.generateAxisLines();
        const xAxisLabels = this.generateXaxisLabels();
        const yAxisLabels = this.generateYaxisLabels();
        const dataPointsWithLine = this.generateSequencePoints(data);
        const eiplogue = `</svg>`;

        return `${prologue}${axisLines}${xAxisLabels}${yAxisLabels}${dataPointsWithLine}${eiplogue}`;
    }

    private generateAxisLines() {
        return `
        <g class="grid x-grid" id="xGrid" style="stroke-width: 1px; stroke: #ccc; stroke-dasharray: 0;">
            <line x1="45" x2="45" y1="5" y2="270"></line>
        </g>
        <g class="grid y-grid" id="yGrid" style="stroke-width: 1px; stroke: #ccc; stroke-dasharray: 0;">
            <line x1="45" x2="475" y1="270" y2="270"></line>
        </g>
        `;
    }

    private generateXaxisLabels() {
        // TODO: This should use moment to give the last 2 hours, every 15 mins (8 ticks) or 30 mins (4 ticks).
        return `
        <g class="labels x-labels" style="text-anchor: middle; font-size: .875em;">
            <text x="45" y="290">3:00pm</text>
            <text x="152.5" y="290">3:30pm</text>
            <text x="260" y="290">4:00pm</text>
            <text x="367.5" y="290">4:30pm</text>
            <text x="475" y="290">5:00pm</text>
        </g>
        `;
    }

    private generateYaxisLabels() {
        // TODO: This needs based on the max of the data sequence (0..max)
        return `
        <g class="labels y-labels" style="text-anchor: end; font-size: .875em;">
            <text x="35" y="15">15</text>
            <text x="35" y="100">10</text>
            <text x="35" y="185">5</text>
            <text x="35" y="270">0</text>
        </g>
        `;
    }

    private generateSequencePoints(data: number[]) {
        const scaledData: number[][] = [];
        const scaleFactor = 255.0 / 50;
        const pointsSvg = [];
        const polyLinePoints = [];

        for (let j = 0; j < data.length; j++) {
            scaledData.push([45 + (j * 18.69), 270.0 - ((data[j]) * scaleFactor)]);
        }

        pointsSvg.push("<g class='data'>");

        for (let j = 0; j < scaledData.length; j++) {
            polyLinePoints.push(`${scaledData[j][0]},${scaledData[j][1]} `);
        }

        pointsSvg.push(`<polyline points="${polyLinePoints.join('')}" fill="none" stroke="#090" stroke-width="1px" />`);
        pointsSvg.push("</g>");

        return pointsSvg.join("");
    }
}