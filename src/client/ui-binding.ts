//
// Bindings for direct jQuery calls against the DOM
//

import * as $ from "jquery";

export interface IUiBinding
{
    SetupInitialState(): void;
    SetNavigationChangedCallback(onNavigation: (path: string) => void): void;
    ShowSummaryViewContent(): void;
    ShowInstanceDetailContent(): void;
    RenderTestChart(): void;
}

export class UiBinding implements IUiBinding
{
    public SetupInitialState() {
        // Any nav changes / etc.
        location.hash = "/overview";
    }

    public SetNavigationChangedCallback(onNavigation: (path: string) => void) {
        // This method can be used to wire up any initial event handlers
        $(window).on("hashchange", () => {
            const path = location.hash.replace("#", "");
            onNavigation(path);
            $(".nav li").removeClass("active");
            $(`.nav li[data-action-name="${path}"]`).addClass("active");
        });

        // Let the callback know where we are (in case there was no change event fired)
        onNavigation(location.hash.replace("#", ""));
    }

    public ShowSummaryViewContent(){
        $(".content").hide();
        $("#overviewContent").show();
    }

    public ShowInstanceDetailContent(){
        $(".content").hide();
        $("#instanceDetails").show();
    }

    public RenderTestChart(){

    }
}