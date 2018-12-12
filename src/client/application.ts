import { IUiBinding, UiBinding } from "./ui-binding";

export class Application
{
    private ui: IUiBinding;

    constructor(ui: IUiBinding)
    {
        this.ui = ui;
    }

    public Initialize()
    {
        // TODO:
    }
}

// Our singleton application instance
const app = new Application(new UiBinding());

// $(() => {
//     app.Initialize();
// });