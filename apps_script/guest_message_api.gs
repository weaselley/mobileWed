var SHEET_NAMES = {
  messages: "messages",
  config: "config"
};

var PUBLIC_MESSAGE_FIELDS = [
  "id",
  "name",
  "relationship",
  "side",
  "message",
  "createdAt",
  "lang",
  "status"
];

function doGet(e) {
  try {
    var action = getAction_(e);

    if (action === "messages") {
      return buildJsonResponse_({
        version: getConfigValue_("version", "1"),
        updatedAt: new Date().toISOString(),
        items: getPublishedMessages_()
      });
    }

    return buildJsonResponse_({
      ok: true,
      service: "guest-message-api",
      availableActions: ["messages", "createMessage", "deleteMessage"]
    });
  } catch (err) {
    return buildJsonResponse_({
      ok: false,
      error: "failed_to_handle_get",
      message: err.message
    });
  }
}

function doPost(e) {
  try {
    var payload = parseJsonBody_(e);
    var action = payload.action || getAction_(e);

    if (action === "createMessage") {
      if (!isTruthyConfig_("allowPost")) {
        return buildJsonResponse_({
          ok: false,
          error: "posting_disabled"
        });
      }

      var item = createMessage_(payload);
      return buildJsonResponse_({
        ok: true,
        item: item
      });
    }

    if (action === "deleteMessage") {
      if (!isTruthyConfig_("allowDelete")) {
        return buildJsonResponse_({
          ok: false,
          error: "deleting_disabled"
        });
      }

      var deletedId = deleteMessage_(payload);
      return buildJsonResponse_({
        ok: true,
        deletedId: deletedId
      });
    }

    return buildJsonResponse_({
      ok: false,
      error: "unsupported_action"
    });
  } catch (err) {
    return buildJsonResponse_({
      ok: false,
      error: "failed_to_handle_post",
      message: err.message
    });
  }
}

function setupGuestbookSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var messagesSheet = ensureSheet_(ss, SHEET_NAMES.messages);
  var configSheet = ensureSheet_(ss, SHEET_NAMES.config);

  var messageHeaders = [
    "id",
    "name",
    "relationship",
    "side",
    "message",
    "createdAt",
    "lang",
    "status",
    "password",
    "updatedAt",
    "deletedAt"
  ];

  var configHeaders = ["key", "value"];
  var configRows = [
    ["version", "1"],
    ["guestbookEnabled", "true"],
    ["defaultStatus", "published"],
    ["allowPost", "false"],
    ["allowDelete", "true"],
    ["maxNameLength", "40"],
    ["maxRelationshipLength", "60"],
    ["maxMessageLength", "500"],
    ["duplicateWindowMinutes", "5"],
    ["blockDuplicatePosts", "true"]
  ];

  var sampleMessages = [
    [
      "msg-20260417-001",
      "Kim Hana",
      "Bride friend",
      "bride",
      "Congratulations! Wishing you both a lifetime of love and joy.",
      "2026-04-17T09:30:00+09:00",
      "en",
      "published",
      "",
      "2026-04-17T09:30:00+09:00",
      ""
    ],
    [
      "msg-20260417-002",
      "박민수",
      "신랑 친구",
      "groom",
      "축하해! 오래오래 행복하자.",
      "2026-04-17T10:10:00+09:00",
      "ko",
      "published",
      "",
      "2026-04-17T10:10:00+09:00",
      ""
    ],
    [
      "msg-20260417-003",
      "김하나",
      "신부 친구",
      "bride",
      "정말 축하해! 늘 행복하길 바라.",
      "2026-04-17T11:00:00+09:00",
      "ko",
      "published",
      "",
      "2026-04-17T11:00:00+09:00",
      ""
    ]
  ];

  resetSheet_(messagesSheet);
  resetSheet_(configSheet);

  messagesSheet.getRange(1, 1, 1, messageHeaders.length).setValues([messageHeaders]);
  configSheet.getRange(1, 1, 1, configHeaders.length).setValues([configHeaders]);

  if (configRows.length) {
    configSheet.getRange(2, 1, configRows.length, configRows[0].length).setValues(configRows);
  }

  if (sampleMessages.length) {
    messagesSheet.getRange(2, 1, sampleMessages.length, sampleMessages[0].length).setValues(sampleMessages);
  }

  styleHeader_(messagesSheet, messageHeaders.length);
  styleHeader_(configSheet, configHeaders.length);
  applySheetFormatting_(messagesSheet, configSheet);
  SpreadsheetApp.flush();
}

function createMessage_(payload) {
  var name = trimString_(payload.name);
  var relationship = trimString_(payload.relationship);
  var side = trimString_(payload.side) || "bride";
  var message = trimString_(payload.message);
  var lang = trimString_(payload.lang) || "ko";
  var password = trimString_(payload.password);

  if (!name) {
    throw new Error("name_is_required");
  }
  if (!message) {
    throw new Error("message_is_required");
  }
  if (!password) {
    throw new Error("password_is_required");
  }
  if (side !== "bride" && side !== "groom") {
    throw new Error("invalid_side");
  }
  assertMaxLength_(name, getNumberConfig_("maxNameLength", 40), "name_too_long");
  assertMaxLength_(relationship, getNumberConfig_("maxRelationshipLength", 60), "relationship_too_long");
  assertMaxLength_(message, getNumberConfig_("maxMessageLength", 500), "message_too_long");
  if (lang !== "ko" && lang !== "en") {
    lang = "ko";
  }
  if (isTruthyConfig_("blockDuplicatePosts") && isRecentDuplicateMessage_(name, message)) {
    throw new Error("duplicate_message_recently_submitted");
  }

  var now = new Date();
  var createdAt = now.toISOString();
  var id = createMessageId_(now);
  var status = getConfigValue_("defaultStatus", "published");
  var row = [
    id,
    name,
    relationship,
    side,
    message,
    createdAt,
    lang,
    status,
    password,
    createdAt,
    ""
  ];

  var sheet = getRequiredSheet_(SHEET_NAMES.messages);
  sheet.appendRow(row);

  return pickPublicFields_({
    id: id,
    name: name,
    relationship: relationship,
    side: side,
    message: message,
    createdAt: createdAt,
    lang: lang,
    status: status
  });
}

function deleteMessage_(payload) {
  var id = trimString_(payload.id);
  var password = trimString_(payload.password);

  if (!id) {
    throw new Error("id_is_required");
  }
  if (!password) {
    throw new Error("password_is_required");
  }

  var sheet = getRequiredSheet_(SHEET_NAMES.messages);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    throw new Error("message_not_found");
  }

  var headers = values[0];
  var rowIndex = -1;
  var record = null;

  values.slice(1).some(function(row, idx) {
    if (isEmptyRow_(row)) return false;
    var item = rowToObject_(headers, row);
    if (trimString_(item.id) !== id) return false;
    rowIndex = idx + 2;
    record = item;
    return true;
  });

  if (!record || rowIndex < 2) {
    throw new Error("message_not_found");
  }
  if (trimString_(record.deletedAt)) {
    throw new Error("already_deleted");
  }
  if (!trimString_(record.password)) {
    throw new Error("password_not_set");
  }
  if (trimString_(record.password) !== password) {
    throw new Error("invalid_password");
  }

  var updatedAt = new Date().toISOString();
  var statusCol = findHeaderColumnIndex_(headers, "status");
  var updatedAtCol = findHeaderColumnIndex_(headers, "updatedAt");
  var deletedAtCol = findHeaderColumnIndex_(headers, "deletedAt");

  if (statusCol > -1) sheet.getRange(rowIndex, statusCol + 1).setValue("deleted");
  if (updatedAtCol > -1) sheet.getRange(rowIndex, updatedAtCol + 1).setValue(updatedAt);
  if (deletedAtCol > -1) sheet.getRange(rowIndex, deletedAtCol + 1).setValue(updatedAt);

  return id;
}

function getPublishedMessages_() {
  var rows = getSheetObjects_(SHEET_NAMES.messages);
  var items = rows
    .filter(function(item) {
      return item.status === "published" && !trimString_(item.deletedAt);
    })
    .sort(function(a, b) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .map(function(item) {
      return pickPublicFields_(item);
    });

  return items;
}

function getSheetObjects_(sheetName) {
  var sheet = getRequiredSheet_(sheetName);
  var values = sheet.getDataRange().getValues();

  if (values.length < 2) return [];

  var headers = values[0];
  return values.slice(1).reduce(function(items, row) {
    if (isEmptyRow_(row)) return items;
    items.push(rowToObject_(headers, row));
    return items;
  }, []);
}

function getConfigMap_() {
  var rows = getSheetObjects_(SHEET_NAMES.config);
  return rows.reduce(function(map, row) {
    if (!row.key) return map;
    map[String(row.key)] = row.value;
    return map;
  }, {});
}

function getConfigValue_(key, fallback) {
  var config = getConfigMap_();
  if (Object.prototype.hasOwnProperty.call(config, key)) {
    return String(config[key]);
  }
  return fallback;
}

function getNumberConfig_(key, fallback) {
  var value = Number(getConfigValue_(key, String(fallback)));
  return isFinite(value) && value > 0 ? value : fallback;
}

function isTruthyConfig_(key) {
  var value = getConfigValue_(key, "false").toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

function isRecentDuplicateMessage_(name, message) {
  var rows = getSheetObjects_(SHEET_NAMES.messages);
  var windowMinutes = getNumberConfig_("duplicateWindowMinutes", 5);
  var cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000).getTime();

  return rows.some(function(item) {
    var status = trimString_(item.status);
    var createdAt = new Date(item.createdAt).getTime();

    if (status !== "published" && status !== "pending") return false;
    if (trimString_(item.deletedAt)) return false;
    if (trimString_(item.name) !== name) return false;
    if (trimString_(item.message) !== message) return false;
    if (!isFinite(createdAt)) return false;

    return createdAt >= cutoffTime;
  });
}

function getAction_(e) {
  if (e && e.parameter && e.parameter.action) {
    return String(e.parameter.action);
  }
  return "";
}

function parseJsonBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }
  return JSON.parse(e.postData.contents);
}

function buildJsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getRequiredSheet_(name) {
  var sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) {
    throw new Error("missing_sheet:" + name);
  }
  return sheet;
}

function ensureSheet_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (sheet) return sheet;
  return ss.insertSheet(name);
}

function resetSheet_(sheet) {
  sheet.clear();
  var maxRows = sheet.getMaxRows();
  var maxCols = sheet.getMaxColumns();

  if (maxRows > 1000) {
    sheet.deleteRows(1001, maxRows - 1000);
  }
  if (maxCols > 26) {
    sheet.deleteColumns(27, maxCols - 26);
  }
}

function styleHeader_(sheet, columnCount) {
  var range = sheet.getRange(1, 1, 1, columnCount);
  range
    .setFontWeight("bold")
    .setBackground("#f3efe9")
    .setFontColor("#222222")
    .setBorder(true, true, true, true, true, true);
}

function applySheetFormatting_(messagesSheet, configSheet) {
  messagesSheet.setFrozenRows(1);
  configSheet.setFrozenRows(1);

  messagesSheet.setColumnWidth(1, 170);
  messagesSheet.setColumnWidth(2, 120);
  messagesSheet.setColumnWidth(3, 150);
  messagesSheet.setColumnWidth(4, 90);
  messagesSheet.setColumnWidth(5, 360);
  messagesSheet.setColumnWidth(6, 220);
  messagesSheet.setColumnWidth(7, 80);
  messagesSheet.setColumnWidth(8, 110);
  messagesSheet.setColumnWidth(9, 120);
  messagesSheet.setColumnWidth(10, 220);
  messagesSheet.setColumnWidth(11, 220);

  configSheet.setColumnWidth(1, 180);
  configSheet.setColumnWidth(2, 180);
}

function rowToObject_(headers, row) {
  return headers.reduce(function(obj, header, idx) {
    obj[String(header)] = row[idx];
    return obj;
  }, {});
}

function findHeaderColumnIndex_(headers, key) {
  for (var i = 0; i < headers.length; i += 1) {
    if (String(headers[i]) === key) return i;
  }
  return -1;
}

function isEmptyRow_(row) {
  return row.every(function(cell) {
    return trimString_(cell) === "";
  });
}

function trimString_(value) {
  if (value == null) return "";
  return String(value).trim();
}

function assertMaxLength_(value, maxLength, errorCode) {
  if (trimString_(value).length > maxLength) {
    throw new Error(errorCode);
  }
}

function pickPublicFields_(item) {
  return PUBLIC_MESSAGE_FIELDS.reduce(function(obj, key) {
    obj[key] = item[key] == null ? "" : item[key];
    return obj;
  }, {});
}

function createMessageId_(date) {
  var y = date.getFullYear();
  var m = pad2_(date.getMonth() + 1);
  var d = pad2_(date.getDate());
  var prefix = "msg-" + y + m + d + "-";
  var rows = getSheetObjects_(SHEET_NAMES.messages);
  var countForDay = rows.filter(function(item) {
    return trimString_(item.id).indexOf(prefix) === 0;
  }).length + 1;

  return prefix + ("000" + countForDay).slice(-3);
}

function pad2_(num) {
  return ("0" + num).slice(-2);
}
