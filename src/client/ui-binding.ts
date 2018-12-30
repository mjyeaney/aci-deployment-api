import * as $ from "jquery";

export interface IUiBinding
{
    SetupInitialState(): void;
    SetNavigationChangedCallback(onNavigation: (path: string) => void): void;
    ShowSummaryViewContent(): void;
    ShowInstanceDetailContent(): void;
}

export class UiBinding implements IUiBinding
{
    public SetupInitialState() {
        // Any nav changes / etc.
        location.hash = "/overview";
    }

    public SetNavigationChangedCallback(onNavigation: (path: string) => void) {
        // This method can be used to wire up any initial event handlers
        $(window).on('hashchange', () => {
            const navTitle = location.hash.replace('#', '');
            onNavigation(navTitle);
            $(".nav li").removeClass("active");
            $(`.nav li[data-action-name="${navTitle}"]`).addClass("active");
        });
    }

    public ShowSummaryViewContent(){
        $(".content").hide();
        $("#overviewContent").show();
    }

    public ShowInstanceDetailContent(){
        $(".content").hide();
        $("#instanceDetails").show();
    }
}