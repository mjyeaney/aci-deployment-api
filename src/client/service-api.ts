//
// Contains methods used to call REST endpoints aainst our server
//
// NOTE: The UI manipulatino needs fatored out of here..just copy/pasta'd for now.
//

import * as $ from "jquery";

export interface IServiceApi {
    LoadSummaryData(): Promise<any>;
}

class SequenceSummary {
    Minimum: number = 0;
    Maximum: number = 0;
    Average: number = 0;
}

export class ServiceApi implements IServiceApi {
    public LoadSummaryData() {
        return new Promise<void>((resolve, reject) => {
            $.ajax({
                method: "GET",
                url: "/api/overviewSummary"
            }).done((results) => {
                results.RunningSummary = this.getSequenceSummary(results.RunningInstanceCounts);
                results.StoppedSummary = this.getSequenceSummary(results.StoppedInstanceCounts);
                resolve(results);
            });
        });
    }

    private getSequenceSummary(data: number[]): SequenceSummary
    {
        let s = new SequenceSummary();
        s.Minimum = Number.MAX_SAFE_INTEGER;
        s.Maximum = Number.MIN_SAFE_INTEGER;
        let sum = 0.0;

        data.map((n) => {
            if (n < s.Minimum) s.Minimum = n;
            if (n > s.Maximum) s.Maximum = n;
            sum += n;
        });

        if (data.length === 0){
            s.Minimum = 0.0;
            s.Maximum = 0.0;
            s.Average = 0.0;
        } else {
            s.Average = sum / data.length;
        }
        
        return s;
    }
}