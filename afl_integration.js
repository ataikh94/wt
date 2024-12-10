
/**
 * @function CreateNewObject
 * @author AP
 * @memberof Websoft.WT.CreateNewObject
 * @description Создание объекта во время отправки ии получения данных
 * @param {integer} sObjectId ID системы с которой происходит интеграция (Обязательный параметр)
 * @param {string} sDirection - Направление интеграции возможные значения "receive" или "send" (Обязательный параметр)
 * @param {string} sRequestCode - Код обрабатываемого запроса (Обязательный параметр)
 * @param {date} dStartDate - Дата после которой можно создавать и отправлять пакет (Без параметра, будет присвоена нынешняя дата)
 * @param {date} dEndDate - последняя дата отправки пакета (Необязательный параметр)
 * @param {string} oDataStr - JSON объект с дополнительной информацией (Необязательный параметр)
 * @param {integer} sSecObjectId - Ссылка на ресурс базы на сформированный пакет с данными (Необязательный параметр)
 * @param {string} sStatus - Один из статусов обработки возможные значения "active", "close", "ignore" (Без параметра, будет присвоен статус "active")
 * @returns {object} oRes 
*/

function CreateNewObject(sObjectId, sDirection, sRequestCode, dStartDate, oDataStr, dEndDate, sSecObjectId, sStatus, sTransportID, sQueryID) {
    var oRes = tools.get_code_library_result_object();
    oRes.error = 0;
    oRes.errors = [];
    oRes.result = [];
    try {

        var libParam = tools.get_params_code_library('libAflIntegration');
        var iReceive = OptInt(libParam.GetOptProperty("sRecieveDataObjectType", 7033397654406822469), 7033397654406822469);
        var iSend = OptInt(libParam.GetOptProperty("sSendDataObjectType", 7033397371138841269), 7033397371138841269);
        var bCheckRequiredFields = true;

        sObjectId = OptInt(CheckFilledVariables(sObjectId));
        if (sObjectId == undefined) {
            oRes = ToPushError("Отсутствует или неправильно передано поле object_id", oRes);
            bCheckRequiredFields = false;
        }

        sDirection = String(CheckFilledVariables(sDirection));
        var dFinalStartDate = Date();
        var iDataType;
        switch (sDirection) {
            case "receive":
                iDataType = iReceive;
                sName = "Полученые данные от " + String(dFinalStartDate) + " '" + sRequestCode + "'";
                break;
            case "send":
                iDataType = iSend;
                sName = "Отправленые данные от " + String(dFinalStartDate) + " '" + sRequestCode + "'";
                break;
            default:
                oRes = ToPushError("Отсутствует или неправильно передано поле object_data_type_id", oRes);
                bCheckRequiredFields = false;
                break;
        }

        dStartDate = OptDate(CheckFilledVariables(dStartDate));
        if (dStartDate != undefined) {
            dFinalStartDate = dStartDate;
        } else {
            oRes = ToPushError("Отсутствует или неправильно передано поле start_date. Будет использована нынешняя дата.", oRes);
        }

        sCurentStatus = "active";
        if (CheckFilledVariables(sStatus) != undefined) {
            sStatus = String(sStatus);
            if (sStatus == "active" || sStatus == "close" || sStatus == "ignore") {
                sCurentStatus = sStatus;
            } else {
                oRes = ToPushError("Неправильно передано поле status_id. Будет использован статус active", oRes);
            }
        }

        var bIsThereEndDate = false;
        if (CheckFilledVariables(dEndDate) != undefined) {
            dEndDate = OptDate(dEndDate);
            bIsThereEndDate = CheckNotRequiredField(dEndDate, bIsThereEndDate, "Неправильно передано поле finish_date");
        }

        var sFinalRequestCode = "unknown";
        if (CheckFilledVariables(sRequestCode) != undefined) {
            sFinalRequestCode = sRequestCode;
        } else {
            oRes = ToPushError("Неправильно передано поле request_code. Будет использован тип unknown", oRes);
        }

        var bIsThereDataStr = true;
        if (!IsArray(oDataStr)) {
            oDataStr = []
        }

        var bIsThereSecObjectId = false;
        if (CheckFilledVariables(sSecObjectId) != undefined) {
            sSecObjectId = OptInt(sSecObjectId);
            bIsThereSecObjectId = CheckNotRequiredField(sSecObjectId, bIsThereSecObjectId, "Неправильно передано поле sec_object_id");
        }

        var sCode = '';
        if (CheckFilledVariables(sTransportID) != undefined) {
            sCode = String(sTransportID);
        }


        if (bCheckRequiredFields) {
            if(sQueryID!=undefined)
            {
                docNewObject = tools.open_doc(sQueryID)
            }
            else
            {
                docNewObject = OpenNewDoc("x-local://wtv/wtv_object_data.xmd");
                docNewObject.BindToDb();
            }
            teNewObject = docNewObject.TopElem;
            teNewObject.object_type = "object_data";
            teNewObject.object_id = sObjectId;
            teNewObject.object_data_type_id = iDataType;
            teNewObject.start_date = dFinalStartDate;
            teNewObject.status_id = sCurentStatus;
            teNewObject.name = sName;
            teNewObject.code = sCode;
            if (bIsThereEndDate) {
                teNewObject.finish_date = dEndDate;
            }
            teNewObject.data = sRequestCode;
            if (bIsThereDataStr) {
                teNewObject.data_str = EncodeJson(oDataStr);
            }
            if (bIsThereSecObjectId) {
                teNewObject.sec_object_type = "resource";
                teNewObject.sec_object_id = sSecObjectId;
            }
            docNewObject.Save();
            oRes.result = OptInt(teNewObject.id);
        }

    } catch (er) {
        oRes = ToPushError(er, oRes);
    }
    return oRes;
}

/**
 * @function ChangeStatusForRequestObject
 * @author AP
 * @memberof Websoft.WT.ChangeStatusForRequestObject
 * @description Изменение статуса объекта в зависимости от успешности передачи данных
 * @param {integer} sObjectId ID Данные объекта типа "Система". (Обязательный параметр)
 * @param {string} sStatus - Флаг сообщающий об успешности передачи данных. Возможные значения "success" и "error" (Обязательный параметр)
 * @param {string} sLogText - Переданный Лог если переменная sStatus имеет значение "error" (Необязательный параметр)
 * @returns {object} oRes
*/

function ChangeStatusForRequestObject(iObjectId, sStatus, sLogText, aDataStr) {
    // TODO Создать агент для чистки data_str при success
    var oRes = tools.get_code_library_result_object();
    oRes.error = 0;
    oRes.errors = [];
    oRes.result = [];
    try {
        var bResult = false;
        var bCheckRequiredFields = true;
        iObjectId = OptInt(CheckFilledVariables(iObjectId));
        if (iObjectId == undefined) {
            oRes = ToPushError("Идентификатор объекта отсутствует", oRes);
            bCheckRequiredFields = false;
        }
        sStatus = String(CheckFilledVariables(sStatus));
        if (sStatus != "success" && sStatus != "error") {
            oRes = ToPushError("Статус завершенности отсутствует или имеет неизвестное значение: " + sStatus, oRes);
            bCheckRequiredFields = false;
        }
        var bIsThereLog = false;
        if (CheckFilledVariables(sLogText) != undefined) {
            sLogText = String(sLogText);
            bIsThereLog = true;
        }
        if (bCheckRequiredFields) {
            var docObject = tools.open_doc(iObjectId);
            if (docObject != undefined) {
                var teObject = docObject.TopElem;
                switch (sStatus) {
                    case "success":
                        teObject.status_id = "close";
                        if (aDataStr != undefined && IsArray(aDataStr))
                            teObject.data_str = EncodeJson(aDataStr)
                        teObject.finish_date = Date();
                        break;
                    case "error":
                        teObject.status_id = "ignore";
                        if (aDataStr != undefined && IsArray(aDataStr))
                            teObject.data_str = EncodeJson(aDataStr)

                        if (bIsThereLog)
                            teObject.comment += "[" + StrDate(Date()) + "]" + sLogText + "\n"
                        break;
                }
                docObject.Save();
                bResult = true;
            } else {
                oRes = ToPushError("Не удалось открыть документ по идентификатору: " + iObjectId, oRes);
            }
        }
    } catch (er) {
        oRes = ToPushError(er, oRes);
    }
    oRes.result = bResult;
    return oRes;
}

/**
 * @function SendNotification
 * @author AP
 * @description Отправление уведомлений администратору системы с текстом указанным в функции
 * @param {integer} sObjectId ID Данные объекта типа "Система". Объект с этим ID должен иметь заполненое поле sec_object_id(Тип уведомления) и object_id(Сотрудник - Администратор системы) (Обязательный параметр)
 * @param {string} sText - Текст уведомления (Необязательный параметр)
 * @returns {object} oRes
*/

function SendNotification(iObjectId, sText) {
    var oRes = tools.get_code_library_result_object();
    oRes.error = 0;
    oRes.errors = [];
    oRes.result = [];
    try {
        iObjectId = OptInt(iObjectId);
        var bNotificationSent = false;
        if (!IsEmptyValue(sText)) {
            sText = String(sText);
        }
        if (iObjectId != undefined) {
            oObjectSystem = tools.open_doc(iObjectId);
            if (oObjectSystem != undefined) {
                var iNotificationTypeId = OptInt(oObjectSystem.TopElem.sec_object_id);
                var iAdmin = OptInt(oObjectSystem.TopElem.object_id);
                if (IsEmptyValue(iNotificationTypeId)) {
                    oRes = ToPushError("В объекте очереди запросов с идентификатором " + iObjectId + " отсутствует тип уведомления", oRes);
                }
                if (IsEmptyValue(iAdmin)) {
                    oRes = ToPushError("В объекте очереди запросов с идентификатором " + iObjectId + " отсутствует сотрудник", oRes);
                }
                if (oRes.error == 0) {
                    bNotificationSent = tools.create_notification(iNotificationTypeId, iAdmin, sText);
                    if (bNotificationSent) {
                        sSuccess = "было успешно";
                    } else {
                        sSuccess = "не было";
                    }
                    AlertLog("Уведомление сотруднику " + iAdmin + " " + sSuccess + " отправлено");
                }
            }
        } else {
            ToPushError("Не был передан идентификатор объекта очереди запросов", oRes);
        }
        oRes.result = bNotificationSent;
    } catch (er) {
        ToPushError(er, oRes);
    }
    return oRes;
}

function GetDocumentTypesInfo() {
    oRes = tools.get_code_library_result_object();
    oRes.error = 0;
    oRes.errors = [];
    oRes.result = {};
    var sFunction = 'GetRequestTypeInfo'

    var libParam = tools.get_params_code_library('libAflIntegration');
    var sDocumentTypes = libParam.GetOptProperty("sDocumentTypes", "[]")

    try {
        oRes.result = ParseJson(sDocumentTypes)
    }
    catch (e) {
        oRes = PushError(e, oRes, sFunction)
    }
    oRes.errorText = oRes.errors.join('\n')

    return oRes;
}

function GetRequestTypeInfo(iRequestTypeID) {
    oRes = tools.get_code_library_result_object();
    oRes.error = 0;
    oRes.errors = [];
    oRes.result = {};

    var sFunction = 'GetRequestTypeInfo'

    var libParam = tools.get_params_code_library('libAflIntegration');
    var sRequestTypes = libParam.GetOptProperty("sRequestTypes", "[]")

    try {
        aRequestTypes = ParseJson(sRequestTypes)
        oRequestType = ArrayOptFind(aRequestTypes, "OptInt(This.request_type) == " + OptInt(iRequestTypeID))
        if (oRequestType != undefined) {
            oRes.result = oRequestType
        }
        else if (iRequestTypeID == undefined) {
            oRes.result = aRequestTypes
        }
        else {
            oRes = PushError("Не удалось получить информацию для передонного типа заявки '" + OptInt(iRequestTypeID) + "'", oRes, sFunction)
        }
    }
    catch (e) {
        oRes = PushError(e, oRes, sFunction)
    }
    oRes.errorText = oRes.errors.join('\n')

    return oRes;
}

function PushError(sText, oRes, sFunction, sLib) {
    if (IsEmptyValue(sLib)) sLib = "libAflIntegration"
    oRes = tools.call_code_library_method('libAflMain', 'PushError', [sText, oRes, sFunction, sLib])
    return oRes
}

function CheckFilledVariables(variable) {
    if (IsEmptyValue(variable) || variable == 0) {
        variable = undefined;
    }
    return variable;
}

function CheckNotRequiredField(field, bToFill, sErrorText) {
    if (field != undefined) {
        bToFill = true;
    } else {
        oRes = ToPushError(sErrorText, oRes);
    }
    return bToFill;
}

function ToPushError(sErrorText, oObject) {
    oObject.error = 1;
    oObject.errors.push(sErrorText);
    AlertLog(sErrorText);
    return oObject;
}
function AlertLog(sLog, sLogName) {
    if (sLogName == undefined) sLogName = "Lib_Integration_LOG"
    tools.call_code_library_method("libAflMain", "AlertLog", [sLog, sLogName]);
    return true
}
//Функция для определения типа данных в пакете
function GetPackageType(sXml) {
    oResPacketType = undefined
    aPacketTypes = [
        {
            'priority': 0,
            'key': '<Directory.Collaborator>',
            'name': 'collaborator',
            'library': 'libAfl1CZup',
            'library_function': 'HandleCollaborator'
        },
        {
            'priority': 0,
            'key': '<ExchangeMessage>',
            'name': 'exchange_message',
            'library': 'libAfl1CZup',
            'library_function': 'HandleExchangeMessage'
        },
    ]
    aPacketTypes = ArraySort(aPacketTypes, 'This.priority', '-')
    for (oPacketType in aPacketTypes) {
        if (sXml.indexOf(oPacketType.key) != -1) {
            oResPacketType = oPacketType
            break;
        }
    }
    return oResPacketType
}
//Функция для обработки пакета(выполняет перевод тегов, определения типа данных в пакете и запуск функции обработки)
function HandlePackage(sXml) {
    var oRes = tools.get_code_library_result_object();
    oRes.error = 0;
    oRes.errors = [];
    oRes.result = '';
    sLib = "libAflIntegration"
    sFunction = "HandlePackage"
    try {
        AlertLog(1)

        oResTransslate = TranslateXmlTags(sXml)
        if (oResTransslate.error == 0) {
            AlertLog(2)
            //TODO добавить функцию для определения типа переданной формы
            oPacketType = GetPackageType(oResTransslate.result)
            AlertLog(oResTransslate.result)
            docPacketContent = undefined
            try {
                //docPacketContent = OpenDocFromStr(oResTransslate.result, "form='x-local://wtv/custom_libs/"+oPacketType.name+".xmd'")
                docPacketContent = OpenDocFromStr(oResTransslate.result)
            }
            catch (e) {
                oRes = PushError('Возникла ошибка при обработке Xml пакета: ' + e + '. \n ' + oResTransslate.result, oRes, sFunction, sLib)
            }
            if (docPacketContent != undefined) {
                AlertLog(2)
                if(oPacketType!=undefined)
                {
                    AlertLog(3)
                    tePacketContent = docPacketContent.TopElem
                    switch (oPacketType.name) {
                        case 'collaborator':
                            AlertLog(4)
                            oRes = tools.call_code_library_method(oPacketType.library, oPacketType.library_function, [tePacketContent])
                            break;
                        case 'exchange_message':
                            AlertLog(4)
                            oRes = tools.call_code_library_method(oPacketType.library, oPacketType.library_function, [tePacketContent])
                            break;
                        default:
                            AlertLog(5)
                            oRes = PushError('Был передан пакет с содержимым тип которого не обрабатывается.', oRes, sFunction, sLib)
                            break;
                    }
                }
                else
                {
                    oRes = PushError('Был передан пакет с содержимым тип которого не обрабатывается.'+'\n ' + oResTransslate.result, oRes, sFunction, sLib)
                }
            }
            else {
                oRes = PushError("Не удалось открыть XML контента пакета."+'\n ' + oResTransslate.result, oRes, sFunction, sLib)
            }
        }
        else {
            oRes = PushError(oResTransslate.errorText, oRes, sFunction, sLib)
        }
    }
    catch (e) {
        oRes = PushError(e, oRes, sFunction, sLib)
    }
    oRes.errorText = oRes.errors.join("\n")
    return oRes;
}

//Перевод тегов с русского на англ или наоборот
//TODO Добавить в библиотеку
function TranslateXmlTags(sXml, sFromLanguage) {
    var oRes = tools.get_code_library_result_object();
    oRes.error = 0;
    oRes.errors = [];
    oRes.result = '';
    sLib = "libAfl1C"
    sFunction = "TranslateXmlTags"
    try {
        if (sFromLanguage == undefined) sFromLanguage = 'ru'
        if (sFromLanguage == 'ru')
            sToLanguage = 'en'
        else
            sToLanguage = 'ru'
        //sXml = HtmlToPlainText(sXml)
        aDict = [
            {
                'ru': 'Справочник.ФизическиеЛица',
                'en': 'Directory.Collaborator'
            },
            {
                'ru': 'КлючевыеСвойства',
                'en': 'KeyProperties'
            },
            {
                'ru': 'Ссылка',
                'en': 'Link'
            },
            {
                'ru': 'ГруппаДоступа',
                'en': 'AccessGroup'
            },
            {
                'ru': 'Пол',
                'en': 'Gender'
            },
            {
                'ru': 'ДатаРождения',
                'en': 'BirthDay'
            },
            {
                'ru': 'ПометкаУдаления',
                'en': 'IsDeleted'
            },
            {
                'ru': 'ФИО',
                'en': 'Fullname'
            },
            {
                'ru': 'Фамилия',
                'en': 'Lastname'
            },
            {
                'ru': 'Имя',
                'en': 'Firstname'
            },
            {
                'ru': 'Отчество',
                'en': 'Middlename'
            },
            {
                'ru': 'Родитель',
                'en': 'Parent'
            },
            {
                'ru': 'ПерсональныеДанные',
                'en': 'PersonalData'
            },
            {
                'ru': 'ПризнакПолученияЗПЧерезКассу',
                'en': 'IsGetFromCashRegister'
            },
            {
                'ru': 'КонтактнаяИнформация',
                'en': 'ContactInformation'
            },
            {
                'ru': 'Строка',
                'en': 'Line'
            },
            {
                'ru': 'ВидКонтактнойИнформации',
                'en': 'ContactInformationType'
            },
            {
                'ru': 'ЗначенияПолейXML',
                'en': 'FieldsValuesXML'
            },
            {
                'ru': 'ЗначенияПолейJSON',
                'en': 'FieldsValuesJSON'
            },
            {
                'ru': 'ИдентификаторСтроки',
                'en': 'LineID'
            },
            {
                'ru': 'НаименованиеКонтактнойИнформации',
                'en': 'ContactInformationName'
            },
            {
                'ru': 'Инициалы',
                'en': 'Initials'
            },                                            
            {
                'ru': 'Справочник.Должности',
                'en': 'Directory.PositionCommons'
            },
            {
                'ru': 'Наименование',
                'en': 'Name'
            },
            {
                'ru': 'НаименованиеКраткое',
                'en': 'NameShort'
            },
            {
                'ru': 'РеквизитДопУпорядочивания',
                'en': 'PropsAdditionalOrdering'
            },
            {
                'ru': 'ДатаВвода',
                'en': 'DateEntered'
            },
            {
                'ru': 'ДатаИсключения',
                'en': 'DateDeleted'
            },
            {
                'ru': 'ВведенаВШтатноеРасписание',
                'en': 'EnteredInSchedule'
            },
            {
                'ru': 'ИсключенаИзШтатногоРасписания',
                'en': 'DeletedFromSchedule'
            },
            {
                'ru': 'РазрядКатегория',
                'en': 'RankCategory'
            },
            {
                'ru': 'ОКПДТРКод',
                'en': 'OKPDTRCode'
            },
            {
                'ru': 'СотрудникиКадроваяИстория',
                'en': 'PositionsHRHistory'
            },
            {
                'ru': 'Организация',
                'en': 'Org'
            },
            {
                'ru': 'ИНН',
                'en': 'INN'
            },
            {
                'ru': 'ДатаНачала',
                'en': 'StartDate'
            },
            {
                'ru': 'ДатаОкончания',
                'en': 'EndDate'
            },
            {
                'ru': 'Сотрудник',
                'en': 'Position'
            },
            {
                'ru': 'ТабельныйНомер',
                'en': 'PersonalNumber'
            },
            {
                'ru': 'ВидСобытия',
                'en': 'EventType'
            },
            {
                'ru': 'Должность',
                'en': 'PositionCommon'
            },
            {
                'ru': 'Подразделение', 
                'en': 'Subdivision'            //?
            },
            {
                'ru': 'Справочник.Организации',
                'en': 'Directory.Orgs'
            },
            {
                'ru': 'ГоловнаяОрганизация',
                'en': 'MainOrg'
            },
            {
                'ru': 'ЕстьОбособленныеПодразделения',
                'en': 'ExistSeparateSubdivisions'
            },
            {
                'ru': 'ОбособленноеПодразделение',
                'en': 'SeparateSubdivision'
            },
            {
                'ru': 'ИндивидуальныйПредприниматель',
                'en': 'IndividualEntrepreneur'
            },
            {
                'ru': 'КрупнейшийНалогоплательщик',
                'en': 'LargestTaxpayer'
            },
            {
                'ru': 'НаименованиеПолное',  
                'en': 'NameFull'                        //?
            },
            {
                'ru': 'НаименованиеСокращенное',
                'en': 'NameShort'
            },
            {
                'ru': 'ОГРН',
                'en': 'OGRN'
            },
            {
                'ru': 'НаименованиеОКВЭД',
                'en': 'NameOKVED'
            },
            {
                'ru': 'НаименованиеОКОПФ',
                'en': 'NameOKOPF'
            },
            {
                'ru': 'НаименованиеОКФС',
                'en': 'NameOKFS'
            },
            {
                'ru': 'ГрафикРаботыСотрудников',
                'en': 'WorkSchedulePositions'  // WorkScheduleCollaborator?
            },
            {
                'ru': 'НаименованиеОКФС',
                'en': 'NameOKFS'
            },
            {
                'ru': 'ЗначенияПолей',
                'en': 'FieldsValues'
            },
            {
                'ru': 'ЗначениеJSON',  //?
                'en': 'ValueJSON'
            },
            {
                'ru': 'ЗначениеXML',   //?
                'en': 'ValueXML'
            },
            {
                'ru': 'Справочник.ПодразделенияОрганизаций',   
                'en': 'Directory.SubdivisionsOrgs'
            },
            {
                'ru': 'Владелец',   
                'en': 'Owner'
            },
            {
                'ru': 'Сформировано',   
                'en': 'Create'
            },
            {
                'ru': 'ДатаСоздания',   
                'en': 'DateCreated'
            },
            {
                'ru': 'Расформировано',   
                'en': 'Disbanded'
            },
            {
                'ru': 'ДатаРасформирования',   
                'en': 'DateDisbandment'
            },
            {
                'ru': 'Расформировано',   
                'en': 'Disbanded'
            },
            {
                'ru': 'РеквизитДопУпорядочиванияИерархического',   
                'en': 'AdditionalHierarchicalOrderingRequisite'
            },
            {
                'ru': 'Код',   
                'en': 'Code'
            },
            {
                'ru': 'Справочник.ШтатноеРасписание',   
                'en': 'Directory.StaffingSchedule'
            },
            {
                'ru': 'КоличествоСтавок',   
                'en': 'QuantityBets'
            },
            {
                'ru': 'Утверждена',   
                'en': 'Approved'
            },
            {
                'ru': 'ДатаУтверждения',   
                'en': 'ApprovalDate'
            },
            {
                'ru': 'Закрыта',   
                'en': 'Closed'
            },
            {
                'ru': 'ДатаЗакрытия',   
                'en': 'ClosingDate'
            },
            {
                'ru': 'Описание',   
                'en': 'Description'
            },
            {
                'ru': 'УсловияПриема',   
                'en': 'ConditionsOfAdmission'
            },
            {
                'ru': 'ГруппаПозицийПодразделения',   
                'en': 'DivisionPositionGroup'         //?
            },
            {
                'ru': 'УсловияПриема',   
                'en': 'ConditionsOfAdmission'
            },
            {
                'ru': 'Специальности',   
                'en': 'Specialties'              //?
            },
            {
                'ru': 'Справочник.Сотрудники',   
                'en': 'Directory.Positions'
            },
            {
                'ru': 'ФизическоеЛицо',   
                'en': 'Collaborator'
            },
            {
                'ru': 'ВАрхиве',   
                'en': 'InArchives'
            },
            {
                'ru': 'ГоловнойСотрудник',   
                'en': 'MainPosition'
            },
            {
                'ru': 'ЕдиницаРасчета',   
                'en': 'CalculationUnit'
            },
            {
                'ru': 'ОУЗ',                  //??
                'en': 'OUZ'
            },
            {
                'ru': 'ДатаПриема',   
                'en': 'AdmissionDate'
            },
            {
                'ru': 'Состояние',   
                'en': 'Condition'
            },
            {
                'ru': 'ДатаНачалаДействия',   
                'en': 'StartDateOfValid'
            },
            {
                'ru': 'ДатаОкончанияДействия',   
                'en': 'EndDateOfValid'
            },
            {
                'ru': 'ДатаУвольнения',   
                'en': 'DismissalDate'
            },
            {
                'ru': 'Основной',   
                'en': 'Primary'
            },
            {
                'ru': 'Документ.ЗаявкаНаОтпуск',   
                'en': 'Document.VacationRequest'
            },
            {
                'ru': 'КоличествоДней',   
                'en': 'NumberOfDays'
            },
            {
                'ru': 'ОписаниеОтпуска',   
                'en': 'VacationDescription'
            },
            {
                'ru': 'ОбщиеСвойстваОбъектовФормата',   
                'en': 'GeneralPropertiesFormatObjects'
            },
            {
                'ru': 'Номер',   
                'en': 'Number'
            },
            {
                'ru': 'Дата',   
                'en': 'Date'
            },
            {
                'ru': 'Статус',
                'en': 'Status'
            },
            {
                'ru': 'ВидСообщения',
                'en': 'MessageType'
            },
            {
                'ru': 'Сотрудники',
                'en': 'Positions'
            },
            {
                'ru': 'ПрисоединенныйФайл',
                'en': 'AttachedFile'
            },
            {
                'ru': 'ДополнительныеДанные',
                'en': 'AdditionalData'
            },
            {
                'ru': 'ТекстСообщения',
                'en': 'MessageText'
            },
            {
                'ru': 'Подписанты',
                'en': 'Signatories'
            },
            {
                'ru': 'РольПодписанта',
                'en': 'SignatoryRole'
            },
            {
                'ru': 'Комментарий',
                'en': 'Comment'
            },
            {
                'ru': 'Исполнитель',
                'en': 'Executor'
            },
            {
                'ru': 'ПрисоединенныеФайлы',
                'en': 'AttachedFiles'
            },
            {
                'ru': 'ПрисоединенныеФайлыОбъектов',
                'en': 'AttachedObjectFiles'
            },
            {
                'ru': 'ВладелецТип',
                'en': 'OwnerType'
            },
            {
                'ru': 'Автор',
                'en': 'Author'
            },
            {
                'ru': 'Изменил',
                'en': 'Edited'
            },
            {
                'ru': 'ДатаМодификацииУниверсальная',
                'en': 'UniversalModificationDate'
            },
            {
                'ru': 'ПутьКФайлу',
                'en': 'FilePath'
            },
            {
                'ru': 'РазмещенВКАД',
                'en': 'IsInCAD'
            },
            {
                'ru': 'Расширение',
                'en': 'Extension'
            },
            {
                'ru': 'ФайлХранилище',
                'en': 'FileStorage'
            },
            {
                'ru': 'РазмещенВКАД',
                'en': 'IsInCAD'
            },
            {
                'ru': 'СообщениеОбмена',
                'en': 'ExchangeMessage'
            },
            {
                'ru': 'СрокИсполнения',
                'en': 'DueDates'
            },
            {
                'ru': 'Справочник.ДоговорыКонтрагентов',
                'en': 'Directory.CounteragentsAgreements'
            },
            {
                'ru': 'ВалютаВзаиморасчетов',
                'en': 'CurrencyOfTheSettlements'
            },
            {
                'ru': 'Справочник.ПрисоединенныеФайлы',
                'en': 'Directory.AttachedFiles'
            },
            {
                'ru': 'Значение',
                'en': 'Value'
            },
        ]
        for (oDict in aDict) {
            sFromTagName = oDict.GetProperty(sFromLanguage)
            sToTagName = oDict.GetProperty(sToLanguage)
            sXml = StrReplace(sXml, '<' + sFromTagName + '>', '<' + sToTagName + '>')
            sXml = StrReplace(sXml, '</' + sFromTagName + '>', '</' + sToTagName + '>')
            sXml = StrReplace(sXml, '<' + sFromTagName + '/>', '<' + sToTagName + '/>')
            sXml = StrReplace(sXml, '<' + sFromTagName + ' xsi:nil="true"/>', '<' + sToTagName + ' xsi:nil="true"/>')
        }
        oRes.result = sXml
    }
    catch (e) {
        oRes = PushError(e, oRes, sFunction, sLib)
    }
    oRes.errorText = oRes.errors.join("\n")
    return oRes;
}

//Функция для получения информации о системе интеграции
function GetSystemObject(sCode) {
    oRes = tools.get_code_library_result_object();
    oRes.error = 0;
    oRes.errors = [];
    oRes.result = {
        "iSystemID": 0,
        "iSystemCollaboratorAdminID": 0,
        "sLogin": "",
        "sPassword": "",
        "sLinkMain": "",
        "sLinkAPI": "",
        "sLinkVerification": "",
        "sLinkDocumentSign": ""
    };

    sFunction = 'GetSystemObject'

    try {
        //var libParam = tools.get_params_code_library('libAflIntegration1С');
        //Добавить в параметры библиотеки
        //var iTessaSystemObjectID = OptInt(libParam.GetOptProperty("s1CSystemObject", 7033401939794434866), 7033401939794434866);
        oSystem = ArrayOptFirstElem(XQuery("for $elem in object_datas where object_data_type_id = 7033397860783141973 and contains(code,'" + sCode + "') return $elem"))
        if (oSystem != undefined) {
            docSystemObject = tools.open_doc(oSystem.id)
            if (docSystemObject != undefined) {
                teSystemObject = docSystemObject.TopElem
                ceSystemObject = teSystemObject.custom_elems

                oRes.result.iSystemID = oSystem.id
                oRes.result.iSystemCollaboratorAdminID = OptInt(teSystemObject.object_id, 0)
                oRes.result.sLogin = String(ceSystemObject.ObtainChildByKey("sLogin").value)
                oRes.result.sPassword = String(ceSystemObject.ObtainChildByKey("sPassword").value)
                oRes.result.sLinkMain = String(ceSystemObject.ObtainChildByKey("sLinkMain").value)
                oRes.result.sLinkAPI = String(ceSystemObject.ObtainChildByKey("sLinkAPI").value)
                oRes.result.sLinkVerification = String(ceSystemObject.ObtainChildByKey("sLinkVerification").value)
                oRes.result.sLinkDocumentSign = String(ceSystemObject.ObtainChildByKey("sLinkDocumentSign").value)

            }
            else {
                oRes = PushError('Не удалось открыть документ с настройками системы интеграции с кодом' + sCode, oRes, sFunction)
            }
        }
        else {
            oRes = PushError('Не удалось Найти систему с кодом: ' + sCode, oRes, sFunction)
        }
    }
    catch (e) {
        PushError(e, oRes, sFunction)
    }

    oRes.errorText = oRes.errors.join('\n')

    return oRes;
}

//Генерация guid на основе id
// TODO Перенести в библиотеку для настройки отправки сообщений
function wsIdToGuid(ws_id) {
    var sGuid = '';

    if (OptInt(ws_id) != undefined) {
        ws_id = '0x' + StrHexInt(OptInt(ws_id))
    }

    sGuid += StrRangePos(ws_id, 10, 18);
    sGuid += "-";
    sGuid += StrRangePos(ws_id, 6, 10);
    sGuid += "-";
    sGuid += StrRangePos(ws_id, 2, 6);

    sInstallStamp = global_settings.install_stamp;
    sHexInstallStamp = HexData(sInstallStamp);

    sGuid += "-";
    sGuid += StrRangePos(sHexInstallStamp, 36, 40);
    sGuid += "-";
    sGuid += StrRangePos(sHexInstallStamp, 28, 36);

    return StrLowerCase(sGuid);
}

//Получения Заголовков для отправки запроса на шину
function Get1CHeader(sAction, sLogin, sPass) {
    return [
        { "name": "Content-Type", "value": "application/xml" },
        { "name": "Authorization", "value": "Basic " + Base64Encode(sLogin + ':' + sPass) },
        { "name": "SOAPAction", "value": "http://www.1c-esb.ru/connector/universal/system/1.0/" + sAction },
    ]
}