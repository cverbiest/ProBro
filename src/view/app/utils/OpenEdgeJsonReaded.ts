import { PfParser } from "./PfParser";
import { IConfig } from "../model";

export function readFile(fileName: string): string {
  while (fileName.charAt(0) === "/") {
    fileName = fileName.substring(1);
  }
  const fs = require("fs");
  const allFileContents = fs.readFileSync(fileName, "utf-8");

  return allFileContents;
}

export function parseOEFile(fileContent: string) {
  const data = JSON.parse(fileContent);
  const { name, dbConnections } = data;
  let configList: IConfig[] = [];

  const groupName = name;
  let num = 0;

  dbConnections.forEach((connection) => {
    const { name, connect } = connection;

    const pfParser = new PfParser();
    const pfConfig = pfParser.parse(connect);

    num++;

    const config: IConfig = {
      id: "local" + num,
      label: name,
      name: pfConfig.name,
      description: "from openedge",
      host: pfConfig.host,
      port: pfConfig.port,
      user: pfConfig.user,
      password: pfConfig.password,
      group: groupName,
      params: pfConfig.params,
    };

    configList.push(config);
  });

  return configList;
}
