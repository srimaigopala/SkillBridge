package com.skillbridge.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {

    @GetMapping("/api/test")
    public String test() {
        return "SkillBridge Backend is running 🚀";
    }

    @GetMapping("/api/test/protected")
    public String protectedTest() {
        return "You are authenticated! 🔐";
    }
}