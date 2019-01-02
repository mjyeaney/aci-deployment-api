//
// Class for generating SVG line charts used on the overview page
//

export interface IChart {
    RenderChart(data: number[][]): string;
}

export class LineChart implements IChart {
    public RenderChart(data: number[][]) {
        const prologue = `<svg style="height: 300px; width: 100%;" viewbox="0,0 500,300">`;
        const axisLines = this.generateAxisLines();
        const xAxisLabels = this.generateXaxisLabels();
        const yAxisLabels = this.generateYaxisLabels();
        const dataPointsWithLine = this.generateSequencePoints();
        const eiplogue = `</svg>`;

        return `${prologue}${axisLines}${xAxisLabels}${yAxisLabels}${dataPointsWithLine}${eiplogue}`;
    }

    private generateAxisLines(){
        return  `
        <g class="grid x-grid" id="xGrid" style="stroke-width: 1px; stroke: #ccc; stroke-dasharray: 0;">
            <line x1="45" x2="45" y1="5" y2="270"></line>
        </g>
        <g class="grid y-grid" id="yGrid" style="stroke-width: 1px; stroke: #ccc; stroke-dasharray: 0;">
            <line x1="45" x2="475" y1="270" y2="270"></line>
        </g>
        `;
    }

    private generateXaxisLabels(){
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

    private generateYaxisLabels(){
        return `
        <g class="labels y-labels" style="text-anchor: end; font-size: .875em;">
            <text x="35" y="15">15</text>
            <text x="35" y="100">10</text>
            <text x="35" y="185">5</text>
            <text x="35" y="270">0</text>
        </g>
        `;
    }

    private generateSequencePoints(){
        const data: number[][] = [];
        const size = 24;
        const scaleFactor = 255.0 / 50;
        const pointsSvg = [];
        const polyLinePoints = [];

        for (let j = 0; j < size; j++){
            data.push([45 + (j * 18.69), 270.0 - ((Math.random() * 50) * scaleFactor)]);
        }

        pointsSvg.push("<g class='data'>");

        for (let j = 0; j < data.length; j++){
            //pointsSvg.push(`<circle cx="${data[j][0]}" cy="${data[j][1]}" r="3" fill="#090"></circle>`);
            polyLinePoints.push(`${data[j][0]},${data[j][1]} `);
        }

        pointsSvg.push(`<polyline points="${polyLinePoints.join('')}" fill="none" stroke="#090" stroke-width="1px" />`);
        pointsSvg.push("</g>");
        
        return pointsSvg.join("");
    }
}