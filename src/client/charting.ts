//
// Class for generating SVG line charts used on the overview page
//

export interface IChart {
    RenderChart(data: number[][]): string;
}

export class LineChart implements IChart {
    public RenderChart(data: number[][]) {
        const prologue = `<svg style="height: 300px; width: 500px;" viewbox="0 0 800 400">`;
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
        </g>
        `;
    }

    private generateSequencePoints(){
        const data: number[][] = [];
        const size = 240;
        const scaleFactor = 370.0 / 50;
        const pointsSvg = [];
        const polyLinePoints = [];

        for (let j = 0; j < size; j++){
            data.push([(j * 2.5) + 90, 370.0 - ((Math.random() * 50) * scaleFactor)]);
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