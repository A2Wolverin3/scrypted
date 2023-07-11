import sdk, { AdoptDevice, Device, DeviceCreatorSettings, DeviceDiscovery, DeviceInformation, DeviceProvider, DiscoveredDevice, Intercom, MediaObject, MediaStreamOptions, ObjectDetectionTypes, ObjectDetector, ObjectsDetected, PanTiltZoom, PanTiltZoomCommand, PictureOptions, Reboot, ScryptedDeviceBase, ScryptedDeviceType, ScryptedInterface, ScryptedNativeId, ScryptedPlugin, Setting, Settings, SettingValue, VideoCamera, VideoCameraConfiguration } from "@scrypted/sdk";
import { AddressInfo } from "net";
import onvif from 'onvif';
import { Stream } from "stream";
import xml2js from 'xml2js';
import { Destroyable, RtspProvider, RtspSmartCamera, UrlMediaStreamOptions } from "../../rtsp/src/rtsp";
import { OnvifCamera, OnvifProvider } from "../../onvif/src/main";
//import OnvifCamera from "../../onvif/src/main";
import { connectCameraAPI, OnvifCameraAPI } from "../../onvif/src/onvif-api";
//import { connectCameraAPI, OnvifCameraAPI, OnvifEvent } from "./onvif-api";
import { OnvifIntercom } from "./onvif-intercom";
import { OnvifPTZMixinProvider } from "./onvif-ptz";

const { mediaManager, systemManager, deviceManager } = sdk;

class FlowerBugProvider extends ScryptedDeviceBase implements DeviceProvider {
    constructor(nativeId?: string) {
        super(nativeId);

        this.prepareDevices();
    }

    async prepareDevices() {
        // "Discover" the lights provided by this provider to Scrypted.
        await sdk.deviceManager.onDevicesChanged({
            devices: [
                {
                    nativeId: 'doorbell',
                    name: 'Doorbell2',
                    type: ScryptedDeviceType.Doorbell,
                    interfaces: [
                        ScryptedInterface.ObjectDetector,
                        ScryptedInterface.BinarySensor,
                        ScryptedInterface.Intercom,
                        ScryptedInterface.Reboot,
                        ScryptedInterface.Camera,
                        ScryptedInterface.AudioSensor,
                        ScryptedInterface.MotionSensor,
                        ScryptedInterface.VideoCameraConfiguration,
                    ]
                },
                {
                    nativeId: 'maeclub',
                    name: 'MAE Club',
                    type: ScryptedDeviceType.Camera,
                    interfaces: [
                        ScryptedInterface.ObjectDetector,
                        ScryptedInterface.Reboot,
                        ScryptedInterface.Camera,
                        ScryptedInterface.AudioSensor,
                        ScryptedInterface.MotionSensor,
                        ScryptedInterface.VideoCameraConfiguration,
                    ]
                }
            ]
        });
    }

    // After the lights are discovered, Scrypted will request the plugin create the
    // instance that can be used to control and query the light.
    getDeviceOld(nativeId: string) {
        return new OnvifCamera(nativeId);
    }

    async getDevice(nativeId: string) {
        if (nativeId === 'doorbell') {
            const onvifId = systemManager.getDeviceByName("@scrypted/onvif").id;
            if (onvifId) {
                const onvifPlugin = systemManager.getDeviceById<OnvifProvider>(onvifId);
                if (onvifPlugin) {
                    var settings = {};
                    settings["username"] = "admin";
                    settings["password"] = "goblue";
                    settings["ip"] = "10.0.0.3";
                    settings["port"] = "8000";
                    settings["skipValidate"] = false;
                    let doorbell: OnvifCamera;
                    doorbell = await onvifPlugin.getDevice(await onvifPlugin.createDevice(settings, nativeId));
                    // await doorbell.putSetting("onvifTwoWay", "true");
                    // await doorbell.putSetting("onvifDoorbell", "true");
                    // await doorbell.putSetting("onvifDoorbellEvent", "RuleEngine/MyRuleDetector/Visitor");
                    //var doorbellId = await onvifPlugin.createDevice(settings, nativeId);
                    //let doorbell: OnvifCamera;
                    //doorbell = systemManager.getDeviceById<OnvifCamera>(doorbellId);
                    // settings = {};
                    // settings["onvifDoorbell"] = true;
                    // settings["onvifDoorbellEvent"] = "RuleEngine/MyRuleDetector/Visitor";
                    doorbell.isDoorbell = true;
                    doorbell.onvifDoorbell = true;
                    doorbell.onvifDoorbellEvent = "RuleEngine/MyRuleDetector/Visitor";
                    doorbell.onvifTwoWay = true;
                    doorbell.manufacturer = "Reolink";
                    doorbell.model = "Video Doorbell WiFi";
                    doorbell.serialNumber = "95270004TJQQ5LC7";
                    doorbell.updateDevice()
                }
            }
        }
    }

    async releaseDevice(id: string, nativeId: string) {
        // Do nothing? The cameras were added through the OnvifProvider, so it should be managing them, yes?)
    }
}

export default FlowerBugProvider;
