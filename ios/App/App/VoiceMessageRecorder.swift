//
//  VoiceMessageRecorder.swift
//  Voice message recording using AVAudioRecorder
//

import Foundation
import AVFoundation

class VoiceMessageRecorder: NSObject {
    private var audioRecorder: AVAudioRecorder?
    private var recordingURL: URL?
    private var recordingSession: AVAudioSession = AVAudioSession.sharedInstance()
    
    func startRecording(completion: @escaping (Bool) -> Void) {
        do {
            try recordingSession.setCategory(.playAndRecord, mode: .default)
            try recordingSession.setActive(true)
            
            let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            let audioFilename = documentsPath.appendingPathComponent("voice_message_\(Date().timeIntervalSince1970).m4a")
            recordingURL = audioFilename
            
            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                AVSampleRateKey: 44100,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
            ]
            
            audioRecorder = try AVAudioRecorder(url: audioFilename, settings: settings)
            audioRecorder?.delegate = self
            audioRecorder?.record()
            
            completion(true)
        } catch {
            print("Failed to start recording: \(error.localizedDescription)")
            completion(false)
        }
    }
    
    func stopRecording(completion: @escaping (URL?) -> Void) {
        audioRecorder?.stop()
        audioRecorder = nil
        
        do {
            try recordingSession.setActive(false)
        } catch {
            print("Failed to deactivate audio session: \(error.localizedDescription)")
        }
        
        completion(recordingURL)
    }
}

extension VoiceMessageRecorder: AVAudioRecorderDelegate {
    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        if !flag {
            print("Recording finished unsuccessfully")
        }
    }
    
    func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        if let error = error {
            print("Recording error: \(error.localizedDescription)")
        }
    }
}
