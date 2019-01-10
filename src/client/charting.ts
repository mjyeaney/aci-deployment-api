//
// Class for generating SVG line charts used on the overview page
//

import * as moment from "moment";

export interface IChart {
    Render(data: number[]): string;
}

export class LineChart implements IChart {
    private readonly WIDTH: number = 500;
    private readonly HEIGHT: number = 300;
    private readonly MAX_POINTS: number = 60;
    private readonly X_AXIS_MIN: number = 45;
    private readonly X_AXIS_MAX: number = 475;
    private readonly Y_AXIS_MIN: number = 5;
    private readonly Y_AXIS_MAX: number = 270;
    private readonly Y_AXIS_LABELS_XPOS: number = 35;
    private readonly X_AXIS_LABLES_YPOS: number = 290;
    private readonly Y_AXIS_DEFAULT_MAX_VALUE: number = 60;

    public Render(data: number[]) {
        const prologue = `<svg style="height: auto; width: 100%;" viewbox="0,0 ${this.WIDTH},${this.HEIGHT}">`;
        const axisLines = this.generateAxisLines();
        const xAxisLabels = this.generateXaxisLabels(data);
        const yAxisLabels = this.generateYaxisLabels();
        const dataPointsWithLine = this.generateSequencePoints(data);
        const eiplogue = `</svg>`;

        return `${prologue}${axisLines}${xAxisLabels}${yAxisLabels}${dataPointsWithLine}${eiplogue}`;
    }

    private generateAxisLines() {
        return `
        <g class="grid y-grid" id="yGrid" style="stroke-width: 1px; stroke: #ccc; stroke-dasharray: 0;">
            <line x1="${this.X_AXIS_MIN}" x2="${this.X_AXIS_MIN}" y1="${this.Y_AXIS_MIN}" y2="${this.Y_AXIS_MAX}"></line>
        </g>
        <g class="grid x-grid" id="xGrid" style="stroke-width: 1px; stroke: #ccc; stroke-dasharray: 0;">
            <line x1="${this.X_AXIS_MIN}" x2="${this.X_AXIS_MAX}" y1="${this.Y_AXIS_MAX}" y2="${this.Y_AXIS_MAX}"></line>
        </g>
        `;
    }

    private generateXaxisLabels(data: number[]) {
        let currentTime = moment();
        let startTime = currentTime;
        
        if (data.length > 0){
            startTime = currentTime.add(-1 * data.length, "m");
        }

        let p2 = startTime.clone().add(15, "m");
        let p3 = p2.clone().add(15, "m");
        let p4 = p3.clone().add(15, "m");
        let end = p4.clone().add(15, "m");

        return `
        <g class="labels x-labels" style="text-anchor: middle; font-size: .875em;">
            <text x="45" y="${this.X_AXIS_LABLES_YPOS}">${startTime.hour()}:${(startTime.minute()).toString().padStart(2, "0")}</text>
            <text x="152.5" y="${this.X_AXIS_LABLES_YPOS}">${p2.hour()}:${(p2.minute()).toString().padStart(2, "0")}</text>
            <text x="260" y="${this.X_AXIS_LABLES_YPOS}">${p3.hour()}:${(p3.minute()).toString().padStart(2, "0")}</text>
            <text x="367.5" y="${this.X_AXIS_LABLES_YPOS}">${p4.hour()}:${(p4.minute()).toString().padStart(2, "0")}</text>
            <text x="475" y="${this.X_AXIS_LABLES_YPOS}">${end.hour()}:${(end.minute()).toString().padStart(2, "0")}</text>
        </g>
        `;
    }

    private generateYaxisLabels() {
        // TODO: This needs based on the max of the data sequence (0..max), 
        let sampleMax = this.Y_AXIS_DEFAULT_MAX_VALUE;
        let stops = 3;
        let scaleFactor = sampleMax / stops;

        return `
        <g class="labels y-labels" style="text-anchor: end; font-size: .875em;">
            <text x="${this.Y_AXIS_LABELS_XPOS}" y="15">${(3 * scaleFactor).toFixed(1)}</text>
            <text x="${this.Y_AXIS_LABELS_XPOS}" y="100">${(2 * scaleFactor).toFixed(1)}</text>
            <text x="${this.Y_AXIS_LABELS_XPOS}" y="185">${(1 * scaleFactor).toFixed(1)}</text>
            <text x="${this.Y_AXIS_LABELS_XPOS}" y="270">0</text>
        </g>
        `;
    }

    private generateSequencePoints(data: number[]) {
        const scaledData: number[][] = [];
        const yAxisScalingFactor = (this.Y_AXIS_MAX - this.Y_AXIS_MIN) / this.Y_AXIS_DEFAULT_MAX_VALUE;
        const xAxisScalingFactor = (this.X_AXIS_MAX - this.X_AXIS_MIN) / this.MAX_POINTS;
        const pointsSvg = [];
        const polyLinePoints = [];

        for (let j = 0; j < data.length; j++) {
            scaledData.push([this.X_AXIS_MIN + (j * xAxisScalingFactor), this.Y_AXIS_MAX - ((data[j]) * yAxisScalingFactor)]);
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