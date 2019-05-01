//
// Bindings for direct jQuery calls against the DOM
//

import * as $ from "jquery";
import { IChart, LineChart } from "./charting";
import { OverviewDetails, ConfigurationDetails, ContainerGroupGridRow, AuthInfo, ConfigurationWithStatus } from "../commonTypes";
import { DeploymentsGrid } from "./deploymentsGrid";

export interface IUiBinding
{
    SetupInitialState(): void;
    SetNavigationChangedCallback(onNavigation: (path: string) => void): void;
    ShowUserInfo(authInfo: AuthInfo): void;
    ShowOverviewContent(): void;
    ShowConfigurationData(data: ConfigurationDetails): void;
    ShowSummaryViewData(data: OverviewDetails): void;
    ShowInstanceDetailContent(): void;
    ShowInstanceDetailData(data: ContainerGroupGridRow[]): void;
    ShowPoolStateForm(data: ConfigurationDetails): void;
}

export class UiBinding implements IUiBinding
{
    private readonly lineChartGenerator: IChart;

    constructor (lineChartGenerator: IChart) {
        this.lineChartGenerator = lineChartGenerator;
    }

    public SetupInitialState() {
        // Don't override current location if one is specified
        if (location.hash === "") {
            location.hash = "/overview";
        }
    }

    public SetNavigationChangedCallback(onNavigation: (path: string) => void) {
        const updateUiForPath = () => {
            const path = location.hash.replace("#", "");
            $(".nav li").removeClass("active");
            $(`.nav li[data-action-name="${path}"]`).addClass("active");
            onNavigation(path);
        };

        // This method can be used to wire up any initial event handlers
        $(window).on("hashchange", updateUiForPath);

        // Fire on initial run incase there is no hash-change event (i.e., bookmark)
        updateUiForPath();
    }

    public ShowUserInfo(authInfo: AuthInfo) {
        $(".header .userBadge span").text(authInfo.PrincipalName);
    }

    public ShowOverviewContent() {
        $(".content").hide();
        $("#overviewContent").show();
    }

    public ShowConfigurationData(data: ConfigurationWithStatus) {
        $("#config_tenant_id span").text(data.TenantId!);
        $("#config_subscription_id span").text(data.SubscriptionId!);
        $("#config_region span").text(data.Region!);
        $("#config_resource_group span").text(data.ResourceGroup!);

        $("#config_container_image span").text(data.ContainerImage!);
        $("#config_container_port span").text(data.ContainerPort!);
        $("#config_container_os span").text(data.ContainerOs!);
        $("#config_report_interval span").text(data.ReportingRefreshInterval!);
        $("#config_current_status span").text(data.CurrentStatus!);
    }

    public ShowSummaryViewData(data: OverviewDetails){
        $("#inUseInstanceChart").html(this.lineChartGenerator.Render(data.InUseInstanceCounts));
        $("#freeInstanceChart").html(this.lineChartGenerator.Render(data.FreeInstanceCounts));

        $("#inUseInstanceCount").text(data.InUseInstances);
        $("#inUse-min").text(data.InUseSummary.Minimum);
        $("#inUse-avg").text(data.InUseSummary.Average.toFixed(2));
        $("#inUse-max").text(data.InUseSummary.Maximum);
        
        $("#freeInstanceCount").text(data.FreeInstances);
        $("#free-min").text(data.FreeSummary.Minimum);
        $("#free-avg").text(data.FreeSummary.Average.toFixed(2));
        $("#free-max").text(data.FreeSummary.Maximum);
    }

    public ShowInstanceDetailContent(){
        $(".content").hide();
        $("#instanceDetails").show();
    }

    public ShowInstanceDetailData(data: ContainerGroupGridRow[]){
        const grid = new DeploymentsGrid();
        $("#deploymentsGrid").html(grid.Render(data));
    }

    public ShowPoolStateForm(data: ConfigurationDetails) {
        $(".content").hide();
        $("#poolStateForm").show();

        $("#poolSettings-size").val(data.PoolMinimumSize);
        $("#poolSettings-cpu").val(data.PoolCpuCount);
        $("#poolSettings-mem").val(data.PoolMemoryInGB);
        $("#poolSettings-tag").val(data.PoolContainerImageTag);
    }
}