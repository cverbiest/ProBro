import path = require("path");
import * as vscode from "vscode";
import { ICommand, CommandAction, IConfig } from "../view/app/model";
import { DatabaseProcessor } from "../db/databaseProcessor";
import { IOETableData } from "../db/oe";
import { TableNode } from "../treeview/TableNode";
import { TablesListProvider } from "../treeview/TablesListProvider";
import { FieldsViewProvider } from "./FieldsViewProvider";
import { DumpFileFormatter } from "./DumpFileFormatter";
import { Logger } from "../common/Logger";

export class QueryEditor {
  private readonly panel: vscode.WebviewPanel | undefined;
  private readonly extensionPath: string;
  private disposables: vscode.Disposable[] = [];
  public tableName: string;
  private fieldsProvider: FieldsViewProvider;
  private readonly configuration = vscode.workspace.getConfiguration("ProBro");
  private myLogger = new Logger(true);

  constructor(
    private context: vscode.ExtensionContext,
    private tableNode: TableNode,
    private tableListProvider: TablesListProvider,
    private fieldProvider: FieldsViewProvider
  ) {
    this.extensionPath = context.asAbsolutePath("");
    //        this.tableNode = this.tableListProvider.node;

    this.tableName = tableNode.tableName;
    this.fieldsProvider = fieldProvider;

    this.panel = vscode.window.createWebviewPanel(
      "queryOETable", // Identifies the type of the webview. Used internally
      `${this.tableListProvider.config?.label}.${this.tableNode.tableName}`, // Title of the panel displayed to the user
      vscode.ViewColumn.One, // Editor column to show the new webview panel in.
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.asAbsolutePath(""), "out")),
        ],
      }
    );

    this.panel.iconPath = {
      dark: vscode.Uri.file(path.join( this.extensionPath, "resources", "icon", "query-icon-dark.svg")),
      light: vscode.Uri.file(path.join( this.extensionPath, "resources", "icon", "query-icon-light.svg"))
    };

    if (this.panel) {
      this.panel.webview.html = this.getWebviewContent({
        columns: [],
        data: [],
      });
    }

    this.panel.webview.onDidReceiveMessage(
      (command: ICommand) => {
        this.myLogger.log("command:", command);
        switch (command.action) {
          case CommandAction.Query:
            this.myLogger.log("CommandAction:", command.action);
            if (this.tableListProvider.config) {

              DatabaseProcessor.getInstance()
                .getTableData(
                  this.tableListProvider.config,
                  this.tableNode.tableName,
                  command.params
                )
                .then((oe) => {
                  if (this.panel) {
                    this.panel?.webview.postMessage({
                      id: command.id,
                      command: "data",
                      columns: tableNode.cache?.selectedColumns,
                      data: oe,
                    });
                  }
                    this.myLogger.log("id:", command.id);
                    this.myLogger.log("command:", command);
                    this.myLogger.log("columns:", tableNode.cache?.selectedColumns);
                    this.myLogger.log("data:", oe);
                });
              break;
            }
          case CommandAction.CRUD:
            this.myLogger.log("CommandAction:", command.action);
            if (this.tableListProvider.config) {
              DatabaseProcessor.getInstance()
                .getTableData(
                  this.tableListProvider.config,
                  this.tableNode.tableName,
                  command.params
                )
                .then((oe) => {
                  if (this.panel) {
                    this.panel?.webview.postMessage({
                      id: command.id,
                      command: "crud",
                      data: oe,
                    });
                  }
                    this.myLogger.log("id:", command.id);
                    this.myLogger.log("command:", command);
                    this.myLogger.log("data:", oe);
                });
              break;
            }
          case CommandAction.Submit:
            this.myLogger.log("CommandAction:", command.action);
            if (this.tableListProvider.config) {
              DatabaseProcessor.getInstance()
                .submitTableData(
                  this.tableListProvider.config,
                  this.tableNode.tableName,
                  command.params
                )
                .then((oe) => {
                  if (this.panel) {
                    this.panel?.webview.postMessage({
                      id: command.id,
                      command: "submit",
                      data: oe,
                    });
                  }
                    this.myLogger.log("id:", command.id);
                    this.myLogger.log("command:", command);
                    this.myLogger.log("data:", oe);
                });
              break;
            }
          case CommandAction.Export:
            this.myLogger.log("CommandAction:", command.action);
            if (this.tableListProvider.config) {
              DatabaseProcessor.getInstance()
                .getTableData(
                  this.tableListProvider.config,
                  this.tableNode.tableName,
                  command.params
                )
                .then((oe) => {
                  if (this.panel) {
                    let exportData = oe;
                    if (command.params?.exportType === "dumpFile") {
                      const dumpFileFormatter = new DumpFileFormatter();
                      dumpFileFormatter.formatDumpFile(
                        oe,
                        this.tableNode.tableName,
                        this.tableListProvider.config!.label
                      );
                      exportData = dumpFileFormatter.getDumpFile();
                    }
                    this.panel?.webview.postMessage({
                      id: command.id,
                      command: "export",
                      tableName: this.tableNode.tableName,
                      data: exportData,
                      format: command.params!.exportType,
                    });
                      this.myLogger.log("id:", command.id);
                      this.myLogger.log("command:", command);
                      this.myLogger.log("tableName:", this.tableNode.tableName);
                      this.myLogger.log("data:", exportData);
                      this.myLogger.log("format:", command.params!.exportType);
                  }
                });
            }
            break;
        }
      },
      undefined,
      context.subscriptions
    );

    this.fieldsProvider.addQueryEditor(this);

    this.panel.onDidDispose(
      () => {
        // When the panel is closed, cancel any future updates to the webview content
        this.fieldsProvider.removeQueryEditor(this);
      },
      null,
      context.subscriptions
    );
  }

  public updateFields() {
    this.panel?.webview.postMessage({
      command: "columns",
      columns: this.tableNode.cache?.selectedColumns,
    });
  }

  private getWebviewContent(tableData: IOETableData): string {
    // Local path to main script run in the webview
    const reactAppPathOnDisk = vscode.Uri.file(
      path.join(
        vscode.Uri.file(
          this.context.asAbsolutePath(path.join("out/view/app", "query.js"))
        ).fsPath
      )
    );

    const reactAppUri = this.panel?.webview.asWebviewUri(reactAppPathOnDisk);
    const cspSource = this.panel?.webview.cspSource;

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Config View</title>
        <meta http-equiv="Content-Security-Policy"
              content="default-src 'none';
                      img-src https:;
                      script-src 'unsafe-eval' 'unsafe-inline' ${cspSource};
                      style-src ${cspSource} 'unsafe-inline';">

        <script>
          window.acquireVsCodeApi = acquireVsCodeApi;
          window.tableData = ${JSON.stringify(tableData)};
          window.tableName = ${JSON.stringify(this.tableNode.tableName)};
          window.configuration = ${JSON.stringify(this.configuration)};
        </script>
    </head>
    <body>
        <div id="root"></div>
        <script src="${reactAppUri}"></script>
    </body>
    </html>`;
  }
}
