PROCEDURE LOCAL_PROCESS:
	RUN LOCAL_CONNECT.

	MESSAGE "RECEIVED COMMAND: " inputObject:GetCharacter("command").

	CASE inputObject:GetCharacter("command"):
		WHEN "get_version" THEN DO:
			RUN LOCAL_GET_VERSION.
		END.
		WHEN "get_tables" THEN DO:
			RUN LOCAL_GET_TABLES.
		END.
		WHEN "get_table_data" THEN DO:
			RUN LOCAL_GET_TABLE_DATA.
		END.
		WHEN "get_table_details" THEN DO:
			RUN LOCAL_GET_TABLE_DETAILS.
		END.
		OTHERWISE DO:
			UNDO, THROW NEW Progress.Lang.AppError("Unknown command", 501).
		END.
	END CASE.

	DISCONNECT DICTDB NO-ERROR.
END PROCEDURE.

PROCEDURE LOCAL_CONNECT:
	DEFINE VARIABLE tmpDate AS DATETIME-TZ NO-UNDO.
	DEFINE VARIABLE jsonDebug AS Progress.Json.ObjectModel.JsonObject.

	tmpDate = NOW.
	CONNECT VALUE(inputObject:GetCharacter("connectionString") + " -ld dictdb").

	jsonDebug = jsonObject:GetJsonObject("debug").
	jsonDebug:Add("startConnect", tmpDate).
	jsonDebug:Add("endConnect", NOW).
	jsonDebug:Add("timeConnect", NOW - tmpDate).
	jsonObject:Set("debug", jsonDebug).

	IF NUM-DBS = 0 THEN DO:
		UNDO, THROW NEW Progress.Lang.AppError("No database connected", 500).
	END.
END PROCEDURE.

PROCEDURE LOCAL_GET_DEBUG:
	DEFINE VARIABLE jsonDebug AS Progress.Json.ObjectModel.JsonObject.
	jsonDebug = jsonObject:GetJsonObject("debug").
	jsonDebug:Add("start", tmpDate).
	jsonDebug:Add("end", NOW).
	jsonDebug:Add("time", NOW - tmpDate).
	jsonObject:Set("debug", jsonDebug).
END PROCEDURE.

PROCEDURE LOCAL_GET_VERSION:
	jsonObject:Add("dbversion", DBVERSION(1)).
	jsonObject:Add("proversion", PROVERSION(1)).
END PROCEDURE.

PROCEDURE LOCAL_GET_TABLES:
	DEFINE VARIABLE jsonTables AS Progress.Json.ObjectModel.JsonArray.
	DEFINE VARIABLE qh AS WIDGET-HANDLE.
	DEFINE VARIABLE bh AS HANDLE  NO-UNDO.
	jsonTables = new Progress.Json.ObjectModel.JsonArray().

	CREATE BUFFER bh FOR TABLE "_file".
	CREATE QUERY qh.
	qh:SET-BUFFERS(bh).
	qh:QUERY-PREPARE("for each _file where _file._tbl-type = 'T' no-lock by _file._file-name").
	qh:QUERY-OPEN.

	DO WHILE qh:GET-NEXT():
		jsonTables:Add(qh:GET-BUFFER-HANDLE(1)::_file-name).
	END.

	qh:QUERY-CLOSE().
	DELETE OBJECT qh.
	DELETE OBJECT bh.

	jsonObject:Add("tables", jsonTables).
END PROCEDURE.

PROCEDURE LOCAL_GET_TABLE_DETAILS:
	DEFINE VARIABLE jsonField AS Progress.Json.ObjectModel.JsonObject.
	DEFINE VARIABLE jsonFields AS Progress.Json.ObjectModel.JsonArray.
	DEFINE VARIABLE jsonIndexes AS Progress.Json.ObjectModel.JsonArray.	

	define variable bhFile as handle no-undo.
	define variable bhIndex as handle no-undo.
	define variable bhIndexField as handle no-undo.
	define variable bhField as handle no-undo.
	DEFINE VARIABLE qhIndex AS WIDGET-HANDLE.
	DEFINE VARIABLE qhField AS WIDGET-HANDLE.

	define variable cFieldQuery as character no-undo.
	define variable cIndexQuery as character no-undo.


	jsonFields = new Progress.Json.ObjectModel.JsonArray().
	jsonIndexes = new Progress.Json.ObjectModel.JsonArray().

	// get fields table details

	CREATE BUFFER bhFile FOR TABLE "_file".
	CREATE BUFFER bhField FOR TABLE "_field".

	cFieldQuery = SUBSTITUTE("for each _file where _file._file-name = '&1'" + 
							" , each _field of _file no-lock",
							inputObject:GetCharacter("params")).

	CREATE QUERY qhField.
	qhField:SET-BUFFERS(bhFile, bhField).
	qhField:QUERY-PREPARE(cFieldQuery).
	qhField:QUERY-OPEN.

	DO WHILE qhField:GET-NEXT():
		jsonField = new Progress.Json.ObjectModel.JsonObject().
		jsonField:Add("order", bhField::_order).
		jsonField:Add("name", bhField::_field-name).
		jsonField:Add("type", bhField::_data-type).
		jsonField:Add("format", bhField::_format).
		jsonField:Add("label", bhField::_label).
		jsonField:Add("initial", bhField::_initial).
		jsonField:Add("columnLabel", bhField::_col-label).
		jsonField:Add("mandatory", bhField::_mandatory).
		jsonField:Add("decimals", bhField::_decimals).
		jsonField:Add("rpos", bhField::_field-rpos).
		jsonField:Add("valExp", bhField::_valexp).
		jsonField:Add("valMessage", bhField::_valmsg).
		jsonField:Add("helpMsg", bhField::_help).
		jsonField:Add("description", bhField::_desc).
		jsonField:Add("viewAs", bhField::_view-As).
		jsonFields:Add(jsonField).
	END.		

	qhField:QUERY-CLOSE().
	DELETE OBJECT bhField.
	DELETE OBJECT qhField.
	DELETE OBJECT bhFile.

	// get Index table details
	
	CREATE BUFFER bhFile FOR TABLE "_file".
	CREATE BUFFER bhIndex FOR TABLE "_Index".
	CREATE BUFFER bhIndexField FOR TABLE "_Index-Field".
	CREATE BUFFER bhField FOR TABLE "_Field".

	define buffer bttIndex for ttIndex.

	empty temp-table bttIndex.

	cIndexQuery = substitute("FOR EACH _file where _file._file-name = '&1'" +
						" , EACH _Index OF _file NO-LOCK" + 
						" , EACH _Index-field OF _Index NO-LOCK" + 
						" , EACH _Field of _Index-field NO-LOCK", 
						inputObject:GetCharacter('params')).

	CREATE QUERY qhIndex.
	qhIndex:SET-BUFFERS(bhFile, bhIndex, bhIndexField, bhField).
	qhIndex:QUERY-PREPARE(cIndexQuery).
	qhIndex:QUERY-OPEN.	

	DO WHILE qhIndex:GET-NEXT():
		define variable cFlags as character no-undo.
		define variable cFields as character no-undo.

		find bttIndex where bttIndex.cName = bhIndex::_Index-name no-error.
		if not available bttIndex then do:
			create bttIndex.

			//index name
			bttIndex.cName = bhIndex::_Index-name.

			//index flags
			cFlags = SUBSTITUTE("&1 &2 &3",
										STRING(bhFile::_prime-index = bhIndex:RECID, "P/"),
										STRING(bhIndex::_unique, "U/"),
										STRING(bhIndex::_WordIdx <> ?, "W/")
										).
			cFlags = TRIM(cFLags).
			bttIndex.cFlags = cFlags.
		end.

		//index field

		cFields = SUBSTITUTE("&1 &2&3",
							bttIndex.cFields,
							bhField::_Field-name,
							STRING(bhIndexField::_Ascending, '+/-')
							).
		

		cFields = TRIM(cFields).
		bttIndex.cFields = cFields.
	END.

	qhIndex:QUERY-CLOSE().
	DELETE OBJECT bhFile.
	DELETE OBJECT bhIndex.
	DELETE OBJECT bhIndexField.
	DELETE OBJECT bhField.

	jsonIndexes:read(temp-table bttIndex:handle).

	jsonObject:Add("fields", jsonFields).
	jsonObject:Add("indexes", jsonIndexes).
END PROCEDURE.

PROCEDURE LOCAL_GET_TABLE_DATA:
	DEFINE VARIABLE jsonField AS Progress.Json.ObjectModel.JsonObject.
	DEFINE VARIABLE jsonFields AS Progress.Json.ObjectModel.JsonArray.
	DEFINE VARIABLE jsonData AS Progress.Json.ObjectModel.JsonArray.
	DEFINE VARIABLE jsonSort AS Progress.Json.ObjectModel.JsonArray.
	DEFINE VARIABLE jsonRow AS Progress.Json.ObjectModel.JsonObject.
	DEFINE VARIABLE qh AS WIDGET-HANDLE.
	DEFINE VARIABLE bh AS HANDLE  NO-UNDO.
	DEFINE VARIABLE fqh AS WIDGET-HANDLE.
	DEFINE VARIABLE fbh AS HANDLE  NO-UNDO.
	DEFINE VARIABLE i AS INTEGER NO-UNDO.
	DEFINE VARIABLE j AS INTEGER NO-UNDO.
	DEFINE VARIABLE iPageLength AS INTEGER NO-UNDO.
	DEFINE VARIABLE cWherePhrase AS CHARACTER NO-UNDO.
	DEFINE VARIABLE cOrderPhrase AS CHARACTER NO-UNDO.
	jsonFields = new Progress.Json.ObjectModel.JsonArray().
	jsonData = new Progress.Json.ObjectModel.JsonArray().

	CREATE BUFFER bh FOR TABLE "_file".
	CREATE QUERY qh.
	qh:SET-BUFFERS(bh).
	qh:QUERY-PREPARE(SUBSTITUTE("for each _file where _file._file-name = '&1'", inputObject:GetJsonObject("params"):GetCharacter("tableName"))).
	qh:QUERY-OPEN.

	DO WHILE qh:GET-NEXT():

		CREATE BUFFER fbh FOR TABLE "_field".
		CREATE QUERY fqh.
		fqh:SET-BUFFERS(fbh).
		fqh:QUERY-PREPARE(SUBSTITUTE("for each _field where _field._file-recid = &1 by _field._order", qh:GET-BUFFER-HANDLE(1):RECID)).
		fqh:QUERY-OPEN.

		DO WHILE fqh:GET-NEXT():
			jsonField = new Progress.Json.ObjectModel.JsonObject().
			jsonField:Add("order", fqh:GET-BUFFER-HANDLE(1)::_order).
			jsonField:Add("name", fqh:GET-BUFFER-HANDLE(1)::_field-name).
			jsonField:Add("key", fqh:GET-BUFFER-HANDLE(1)::_field-name).
			jsonFields:Add(jsonField).
		END.

		fqh:QUERY-CLOSE().
		DELETE OBJECT fqh.
		DELETE OBJECT fbh.
	END.

	qh:QUERY-CLOSE().
	DELETE OBJECT qh.
	DELETE OBJECT bh.

	IF inputObject:GetJsonObject("params"):Has("wherePhrase") THEN DO:
		IF TRIM(inputObject:GetJsonObject("params"):GetCharacter("wherePhrase")) > "" THEN DO:
			cWherePhrase = SUBSTITUTE(" where &1", inputObject:GetJsonObject("params"):GetCharacter("wherePhrase")).
		END.
	END.

	IF inputObject:GetJsonObject("params"):Has("sortColumns") THEN DO:
		jsonSort = inputObject:GetJsonObject("params"):GetJsonArray("sortColumns").
		DO i = 1 TO jsonSort:LENGTH:
			cOrderPhrase = SUBSTITUTE("&1 BY &2.&3 &4", 
						cOrderPhrase, 
						inputObject:GetJsonObject("params"):GetCharacter("tableName"),
						jsonSort:GetJsonObject(i):GetCharacter("columnKey"),
						IF jsonSort:GetJsonObject(i):GetCharacter("direction") = "ASC" THEN "" ELSE "DESCENDING").
		END.
	END.


	CREATE BUFFER bh FOR TABLE inputObject:GetJsonObject("params"):GetCharacter("tableName").
	CREATE QUERY qh.
	qh:SET-BUFFERS(bh).
	qh:QUERY-PREPARE(SUBSTITUTE("for each &1 no-lock &2 &3", inputObject:GetJsonObject("params"):GetCharacter("tableName"), cWherePhrase, cOrderPhrase)).
	qh:QUERY-OPEN.
	qh:REPOSITION-TO-ROW(inputObject:GetJsonObject("params"):GetInt64("start") + 1).

	iPageLength = inputObject:GetJsonObject("params"):GetInt64("pageLength").

	DO WHILE qh:GET-NEXT():
		jsonRow = new Progress.Json.ObjectModel.JsonObject().
		DO i = 1 to bh:NUM-FIELDS:
			jsonRow:Add(bh:BUFFER-FIELD(i):NAME, bh:BUFFER-FIELD(i):BUFFER-VALUE).
		END.
		jsonData:Add(jsonRow).
		iPageLength = iPageLength - 1.
		IF iPageLength = 0 THEN LEAVE. 
	END.

	qh:QUERY-CLOSE().
	DELETE OBJECT qh.
	DELETE OBJECT bh.

	jsonObject:Add("columns", jsonFields).
	jsonObject:Add("data", jsonData).
END PROCEDURE.
